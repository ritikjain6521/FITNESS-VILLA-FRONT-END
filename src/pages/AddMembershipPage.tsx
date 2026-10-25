import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, money } from '../api';
import { openRazorpayCheckout } from '../razorpay';
import { ArrowLeft, CreditCard, CheckCircle, Zap } from 'lucide-react';

type Member = { _id: string; name: string; email: string; phone?: string };
type Plan = { _id: string; name: string; pricePaise: number; durationDays: number; description: string };

export default function AddMembershipPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const preselectedMember = sp.get('member') || '';

  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedMember, setSelectedMember] = useState(preselectedMember);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordPayment, setRecordPayment] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<{ items: Member[] }>('/members?limit=200'),
      api<{ items: Plan[] }>('/plans'),
    ]).then(([m, p]) => {
      setMembers(m.items);
      setPlans(p.items);
      if (p.items.length > 0) setSelectedPlan(p.items[0]._id);
      if (preselectedMember) setSelectedMember(preselectedMember);
      else if (m.items.length > 0) setSelectedMember(m.items[0]._id);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [preselectedMember]);

  const activePlan = plans.find(p => p._id === selectedPlan);

  // Calculated End Date
  const calculatedEnd = (() => {
    if (!activePlan || !startDate) return '';
    const d = new Date(startDate);
    d.setDate(d.getDate() + activePlan.durationDays);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember || !selectedPlan) {
      setError('Please select both a member and a plan');
      return;
    }
    setError(''); setSubmitting(true);
    try {
      const res = await api<{ item: { _id: string; member: string } }>('/memberships', {
        method: 'POST',
        body: JSON.stringify({
          member: selectedMember,
          plan: selectedPlan,
          startDate: new Date(startDate),
        }),
      });

      // Optionally record payment
      if (recordPayment && activePlan) {
        if (paymentMethod === 'razorpay') {
          const selectedM = members.find(m => m._id === selectedMember);
          await openRazorpayCheckout({
            amountPaise: activePlan.pricePaise,
            memberId: selectedMember,
            membershipId: res.item._id,
            customerName: selectedM?.name,
            customerEmail: selectedM?.email,
            customerPhone: selectedM?.phone,
            description: `Membership payment for ${activePlan.name}`,
          });
        } else {
          await api('/payments/manual', {
            method: 'POST',
            body: JSON.stringify({
              member: selectedMember,
              membership: res.item._id,
              amountPaise: activePlan.pricePaise,
              method: paymentMethod,
              notes: `Initial payment for ${activePlan.name}`,
            }),
          }).catch(err => console.warn('Payment recording note:', err));
        }
      }

      navigate(`/dashboard/members/${selectedMember}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create membership');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner"/><span>Loading plans & members…</span></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={16}/>Back</button>
          <h1>Create New Membership</h1>
          <p className="muted">Assign a subscription plan to a gym member</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} className="form-grid">
          <label className="full-width">Select Member *
            <select
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              required
            >
              <option value="">-- Choose Member --</option>
              {members.map(m => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.email}{m.phone ? ` · ${m.phone}` : ''})
                </option>
              ))}
            </select>
          </label>

          <label className="full-width">Select Membership Plan *
            <select
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              required
            >
              {plans.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} — {money(p.pricePaise)} ({p.durationDays} days)
                </option>
              ))}
            </select>
          </label>

          {activePlan && (
            <div className="full-width plan-preview-box">
              <div className="plan-preview-inner">
                <div>
                  <strong style={{ color: 'var(--green)' }}>{activePlan.name}</strong>
                  <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>{activePlan.description}</div>
                </div>
                <div className="plan-preview-pricing">
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '24px', fontWeight: 800 }}>{money(activePlan.pricePaise)}</div>
                  <small className="muted">{activePlan.durationDays} days duration</small>
                </div>
              </div>
            </div>
          )}

          <label>Start Date *
            <input
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </label>

          <label>Calculated Expiry Date
            <input
              type="text"
              readOnly
              disabled
              value={calculatedEnd || '—'}
              style={{ background: '#161a17', color: 'var(--green)' }}
            />
          </label>

          <div className="full-width" style={{ marginTop: '10px', padding: '16px', background: '#151914', borderRadius: '6px', border: '1px solid #2a3723' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={recordPayment}
                onChange={e => setRecordPayment(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Record immediate payment for this membership
            </label>

            {recordPayment && activePlan && (
              <div className="payment-mode-group">
                <span className="muted" style={{ fontSize: '12px' }}>Payment Mode:</span>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  style={{ minWidth: '180px', padding: '8px 12px' }}
                >
                  <option value="razorpay">⚡ Razorpay Online Gateway</option>
                  <option value="upi">UPI / GPay / Paytm (Manual)</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card / POS (Manual)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
                <span style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 700 }}>
                  Amount: {money(activePlan.pricePaise)}
                </span>
              </div>
            )}
          </div>

          {error && <p className="error-msg full-width">{error}</p>}

          <div className="form-actions full-width">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-green" disabled={submitting}>
              {recordPayment && paymentMethod === 'razorpay' ? <Zap size={16} /> : <CreditCard size={16}/>}
              {submitting
                ? 'Processing…'
                : recordPayment && paymentMethod === 'razorpay'
                ? 'Pay via Razorpay & Activate'
                : 'Activate Membership'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
