import React, { useEffect, useState } from 'react';
import { api, money, fmt, openWhatsApp } from '../api';
import {
  DollarSign,
  Plus,
  Share2,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import ReceiptModal, { ReceiptData } from '../components/ReceiptModal';

type Member = { _id: string; name: string; email: string; phone?: string };
type Payment = {
  _id: string;
  receiptNumber?: string;
  member: { _id: string; name: string; email: string; phone?: string; address?: string };
  membership?: { plan?: { name: string; pricePaise: number } };
  amountPaise: number;
  method: string;
  status: string;
  paidAt?: string;
  notes?: string;
};

type DueItem = {
  membershipId: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  planName: string;
  planPricePaise: number;
  paidPaise: number;
  duePaise: number;
  startDate: string;
  endDate: string;
  whatsappUrl: string;
  reminderText: string;
};

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'dues'>('payments');
  const [items, setItems] = useState<Payment[]>([]);
  const [dues, setDues] = useState<DueItem[]>([]);
  const [totalDuePaise, setTotalDuePaise] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Manual payment form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ member: '', amountPaise: '', method: 'upi', notes: '', membershipId: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Selected receipt to view/print
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api<{ items: Payment[] }>('/payments'),
      api<{ items: DueItem[]; totalDuePaise: number }>('/payments/dues'),
      api<{ items: Member[] }>('/members?limit=300'),
    ])
      .then(([p, d, m]) => {
        setItems(p.items);
        setDues(d.items || []);
        setTotalDuePaise(d.totalDuePaise || 0);
        setMembers(m.items);
        if (m.items.length > 0 && !form.member) {
          setForm((f) => ({ ...f, member: m.items[0]._id }));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await api<{
        item: Payment;
        whatsappReceiptUrl?: string;
        whatsappReceiptText?: string;
      }>('/payments/manual', {
        method: 'POST',
        body: JSON.stringify({
          member: form.member,
          amountPaise: Math.round(Number(form.amountPaise) * 100),
          method: form.method,
          notes: form.notes,
          membership: form.membershipId || undefined,
        }),
      });

      setShowForm(false);
      setForm((f) => ({ ...f, amountPaise: '', notes: '', membershipId: '' }));
      load();

      // Show receipt right away so staff can print or WhatsApp immediately
      if (res.item) {
        showReceiptForPayment(res.item, res.whatsappReceiptUrl, res.whatsappReceiptText);
      }
    } catch (err: any) {
      setFormError(err.message || 'Payment recording failed');
    } finally {
      setSaving(false);
    }
  }

  function showReceiptForPayment(p: Payment, waUrl?: string, waText?: string) {
    const receiptNo = p.receiptNumber || `RCP-${p._id.slice(-6).toUpperCase()}`;
    const planName = p.membership?.plan?.name;
    setActiveReceipt({
      receiptNumber: receiptNo,
      date: p.paidAt || new Date(),
      customerName: p.member?.name || 'Walk-in Member',
      customerPhone: p.member?.phone,
      customerEmail: p.member?.email,
      items: [
        {
          name: planName ? `Membership: ${planName}` : (p.notes || 'Gym Membership & Facility Fee'),
          qty: 1,
          amountPaise: p.amountPaise,
          details: `Method: ${p.method.toUpperCase()} · Status: Confirmed`,
        },
      ],
      subtotalPaise: p.amountPaise,
      totalPaise: p.amountPaise,
      paymentMethod: p.method,
      status: p.status,
      notes: p.notes,
      whatsappUrl: waUrl,
      whatsappText: waText,
    });
  }

  function handleSharePaymentWhatsApp(p: Payment) {
    api<{ payment: Payment; whatsappReceiptUrl: string }>(`/payments/${p._id}/receipt`)
      .then((r) => {
        if (r.whatsappReceiptUrl) {
          window.open(r.whatsappReceiptUrl, '_blank');
        } else {
          showReceiptForPayment(p);
        }
      })
      .catch(() => showReceiptForPayment(p));
  }

  function handleQuickPayDue(due: DueItem) {
    setForm({
      member: due.memberId,
      amountPaise: (due.duePaise / 100).toString(),
      method: 'upi',
      notes: `Clearing due for ${due.planName}`,
      membershipId: due.membershipId,
    });
    setShowForm(true);
    setActiveTab('payments');
  }

  const totalPaid = items.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amountPaise, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Payments & Billing</h1>
          <p className="muted">
            Total Collections: <strong>{money(totalPaid)}</strong> · Pending Dues: <strong style={{ color: '#ef4444' }}>{money(totalDuePaise)}</strong>
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-green" onClick={() => setShowForm((s) => !s)}>
            <Plus size={16} /> Record Payment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <DollarSign size={16} /> Payment History & Receipts ({items.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'dues' ? 'active' : ''}`}
          onClick={() => setActiveTab('dues')}
        >
          <AlertTriangle size={16} color={dues.length > 0 ? '#ef4444' : undefined} />
          Outstanding Dues ({dues.length})
        </button>
      </div>

      {/* Manual Payment Form */}
      {showForm && (
        <div className="form-card">
          <h3>Record Payment Receipt</h3>
          <form onSubmit={submit} className="form-grid">
            <label className="full-width">
              Select Member *
              <select
                required
                value={form.member}
                onChange={(e) => setForm((f) => ({ ...f, member: e.target.value }))}
              >
                <option value="">-- Choose Member --</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.email}{m.phone ? ` · ${m.phone}` : ''})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Amount (₹) *
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={form.amountPaise}
                onChange={(e) => setForm((f) => ({ ...f, amountPaise: e.target.value }))}
                placeholder="e.g. 2500"
              />
            </label>

            <label>
              Payment Method
              <select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cash">Cash</option>
                <option value="card">Card / POS Terminal</option>
                <option value="bank_transfer">Bank Transfer / IMPS</option>
              </select>
            </label>

            <label className="full-width">
              Receipt Notes / Reference
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Monthly fee instalment or UPI UTR number"
              />
            </label>

            {formError && <p className="error-msg full-width">{formError}</p>}

            <div className="form-actions full-width">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-green" disabled={saving || !form.member}>
                <DollarSign size={16} />
                {saving ? 'Generating Receipt…' : 'Save Payment & Generate Receipt'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      {/* Tab 1: Payment Records */}
      {activeTab === 'payments' && (
        <>
          {loading ? (
            <div className="page-loading">
              <div className="spinner" />
            </div>
          ) : (
            <div className="table-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th>Notes</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-td">
                          No payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      items.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <code>{p.receiptNumber || `RCP-${p._id.slice(-6).toUpperCase()}`}</code>
                          </td>
                          <td>
                            <strong>{p.member?.name || 'Unknown'}</strong>
                            {p.member?.phone && <br />}
                            {p.member?.phone && <small className="muted">{p.member.phone}</small>}
                          </td>
                          <td>
                            <strong style={{ color: 'var(--green)' }}>{money(p.amountPaise)}</strong>
                          </td>
                          <td>
                            <span className="pill">{p.method.toUpperCase()}</span>
                          </td>
                          <td>{p.paidAt ? fmt(p.paidAt) : '—'}</td>
                          <td className="muted">{p.notes || '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => showReceiptForPayment(p)}
                                title="View & Print Bill Receipt"
                              >
                                <Printer size={13} /> Bill
                              </button>
                              <button
                                className="btn btn-sm whatsapp-btn"
                                onClick={() => handleSharePaymentWhatsApp(p)}
                                title="Share Receipt to WhatsApp"
                              >
                                <Share2 size={13} /> WhatsApp
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Outstanding Dues */}
      {activeTab === 'dues' && (
        <>
          <div className="kpi-grid mb-4" style={{ marginBottom: '20px' }}>
            <div className="kpi-card" style={{ borderColor: '#ef4444' }}>
              <div className="kpi-value" style={{ color: '#ef4444' }}>{money(totalDuePaise)}</div>
              <div className="kpi-label">Total Uncollected Dues</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{dues.length}</div>
              <div className="kpi-label">Members with Due Balances</div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th>Plan Cost</th>
                    <th>Paid So Far</th>
                    <th>Balance Due</th>
                    <th>Expiry Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-td">
                        🎉 All members are fully paid! No outstanding dues.
                      </td>
                    </tr>
                  ) : (
                    dues.map((d) => (
                      <tr key={d.membershipId}>
                        <td>
                          <strong>{d.name}</strong>
                          {d.phone && <br />}
                          {d.phone && <small className="muted">{d.phone}</small>}
                        </td>
                        <td>{d.planName}</td>
                        <td>{money(d.planPricePaise)}</td>
                        <td style={{ color: 'var(--green)' }}>{money(d.paidPaise)}</td>
                        <td>
                          <strong style={{ color: '#ef4444', fontSize: '15px' }}>{money(d.duePaise)}</strong>
                        </td>
                        <td className="muted">{fmt(d.endDate)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-sm whatsapp-btn"
                              onClick={() => window.open(d.whatsappUrl, '_blank')}
                              title="Send Due Reminder via WhatsApp"
                            >
                              <MessageSquare size={13} /> WhatsApp Due Alert
                            </button>
                            <button
                              className="btn btn-green btn-sm"
                              onClick={() => handleQuickPayDue(d)}
                              title="Clear Due Balance"
                            >
                              <CheckCircle size={13} /> Pay Balance
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Printable / Shareable Digital Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}
