import { useEffect, useState } from 'react';
import { api, money, fmt, BASE } from '../../api';
import { DollarSign, AlertTriangle, ExternalLink, Download, CreditCard, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import ReceiptModal, { ReceiptData } from '../../components/ReceiptModal';

type PaymentRecord = {
  _id: string;
  amountPaise: number;
  method: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paidAt?: string;
  receiptNumber?: string;
  notes?: string;
  providerOrderId?: string;
  membership?: { plan?: { name: string; pricePaise: number } };
};

type RazorpayOrder = { order: { id: string; amount: number; currency: string }; paymentId: string; keyId: string };

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const statusIcon = (s: string) => {
  if (s === 'paid') return <CheckCircle size={14} className="accent" />;
  if (s === 'pending') return <Clock size={14} style={{ color: '#ffd166' }} />;
  return <XCircle size={14} style={{ color: '#ff6b6b' }} />;
};

export default function MemberPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const fetchPayments = () => {
    setLoading(true);
    api<{ items: PaymentRecord[] }>('/payments')
      .then(r => setPayments(r.items))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(); }, []);

  const filteredPayments = filterStatus === 'all'
    ? payments
    : payments.filter(p => p.status === filterStatus);

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amountPaise, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amountPaise, 0);

  async function handlePayOnline(payment: PaymentRecord) {
    if (!payment.membership) {
      setError('Cannot process payment — no membership linked.');
      return;
    }
    setPayingId(payment._id);
    setError('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay SDK failed to load. Check your internet connection.');

      // Get current user id from /auth/me
      const me = await api<{ user: { id: string; name: string; email: string; phone?: string } }>('/auth/me');
      const order: RazorpayOrder = await api('/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({
          member: me.user.id,
          amountPaise: payment.amountPaise,
          membership: payment.membership,
        }),
      });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.order.amount,
        currency: order.order.currency,
        name: 'Fitness Villa',
        description: `Membership payment`,
        order_id: order.order.id,
        prefill: { name: me.user.name, email: me.user.email, contact: me.user.phone || '' },
        theme: { color: '#b5f23d' },
        handler: async (response: any) => {
          try {
            await api('/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            setSuccessMsg('Payment successful! ✅ Your membership has been updated.');
            fetchPayments();
          } catch (e: any) {
            setError(`Payment verification failed: ${e.message}`);
          }
        },
      });
      rzp.on('payment.failed', (res: any) => {
        setError(`Payment failed: ${res.error?.description || 'Unknown error'}`);
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPayingId(null);
    }
  }

  async function handleDownloadReceipt(paymentId: string) {
    setReceiptLoading(true);
    try {
      const res = await api<{
        payment: any;
        settings: any;
        whatsappReceiptUrl?: string;
        whatsappReceiptText?: string;
      }>(`/payments/${paymentId}/receipt`);

      const p = res.payment;
      const s = res.settings;
      const taxRate = s?.defaultTaxRate || 18;
      const basePaise = Math.round(p.amountPaise / (1 + taxRate / 100));

      const receiptData: ReceiptData = {
        receiptNumber: p.receiptNumber || 'FV-RECEIPT',
        date: p.paidAt || p.createdAt,
        gymName: s?.gymName || 'Fitness Villa',
        gymAddress: s?.address || 'Plot 42, Elite Sports Hub, New Delhi',
        gymPhone: s?.phone || '+91 98765 43210',
        gymGstin: s?.gstin || '07AAAAA0000A1Z5',
        customerName: p.member?.name || 'Valued Member',
        customerEmail: p.member?.email,
        customerPhone: p.member?.phone,
        items: [
          {
            name: p.membership?.plan?.name || 'Gym Membership Pass',
            amountPaise: p.amountPaise,
            details: p.membership?.plan?.durationDays ? `${p.membership.plan.durationDays} Days Pass` : 'Standard Membership',
          },
        ],
        subtotalPaise: basePaise,
        taxPaise: p.amountPaise - basePaise,
        totalPaise: p.amountPaise,
        paymentMethod: p.method,
        status: p.status,
        whatsappUrl: res.whatsappReceiptUrl,
        whatsappText: res.whatsappReceiptText,
      };

      setActiveReceipt(receiptData);
    } catch {
      // Fallback: Open in new tab with token and html format
      const token = localStorage.getItem('fitnessvilla_token') || localStorage.getItem('ironpulse_token') || localStorage.getItem('token');
      window.open(`${BASE}/payments/${paymentId}/receipt?token=${token}&format=html`, '_blank');
    } finally {
      setReceiptLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Payments</h1>
          <p className="muted">View your payment history, outstanding dues, and pay online</p>
        </div>
        <div className="page-actions">
          <select className="select-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="status-banner status-green" style={{ marginBottom: 20 }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setSuccessMsg('')}>×</button>
        </div>
      )}
      {error && (
        <div className="status-banner status-red" style={{ marginBottom: 20 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
        <div className="kpi-card kpi-accent">
          <div className="kpi-icon"><DollarSign size={20} /></div>
          <div className="kpi-value">{money(totalPaid)}</div>
          <div className="kpi-label">Total Paid</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Clock size={20} style={{ color: '#ffd166' }} /></div>
          <div className="kpi-value">{money(totalPending)}</div>
          <div className="kpi-label">Pending Dues</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><CreditCard size={20} /></div>
          <div className="kpi-value">{payments.filter(p => p.status === 'paid').length}</div>
          <div className="kpi-label">Paid Transactions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><XCircle size={20} style={{ color: '#ff6b6b' }} /></div>
          <div className="kpi-value">{payments.filter(p => p.status === 'pending').length}</div>
          <div className="kpi-label">Pending Payments</div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="table-card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <DollarSign size={16} className="accent" />
          <strong style={{ fontSize: 14 }}>Payment History</strong>
          <span className="badge badge-green" style={{ marginLeft: 'auto' }}>{filteredPayments.length} records</span>
        </div>
        {loading ? (
          <div className="page-loading" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Plan</th>
                  <th>Method</th>
                  <th>Receipt</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan={7} className="empty-td">No payment records found.</td></tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p._id}>
                      <td>{p.paidAt ? fmt(p.paidAt) : <span className="muted">—</span>}</td>
                      <td><strong>{money(p.amountPaise)}</strong></td>
                      <td>{p.membership?.plan?.name || <span className="muted">—</span>}</td>
                      <td><span className="pill">{p.method}</span></td>
                      <td>
                        {p.receiptNumber
                          ? <span className="muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>{p.receiptNumber}</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>
                          {statusIcon(p.status)} {p.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {p.status === 'paid' && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => handleDownloadReceipt(p._id)}
                              title="Download receipt"
                            >
                              <Download size={12} /> Receipt
                            </button>
                          )}
                          {p.status === 'pending' && p.method === 'razorpay' && (
                            <button
                              className="btn btn-green"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              disabled={payingId === p._id}
                              onClick={() => handlePayOnline(p)}
                            >
                              <ExternalLink size={12} /> {payingId === p._id ? 'Processing…' : 'Pay Now'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}
