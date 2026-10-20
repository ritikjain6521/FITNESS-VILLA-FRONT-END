import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, money, fmt, daysLeft, openWhatsApp } from '../api';
import {
  CreditCard,
  AlertTriangle,
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  Bell,
  Clock,
  Sparkles,
} from 'lucide-react';

type Membership = {
  _id: string;
  member: { _id: string; name: string; email: string; phone?: string };
  plan: { name: string; pricePaise: number; durationDays: number };
  startDate: string;
  endDate: string;
  status: string;
};

type ExpiringItem = {
  membershipId: string;
  memberId: string;
  name: string;
  phone: string;
  email: string;
  planName: string;
  planPricePaise: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  status: string;
  whatsappUrl: string;
  defaultMessage: string;
};

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>('all');
  const [items, setItems] = useState<Membership[]>([]);
  const [expiringList, setExpiringList] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [runningCron, setRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const navigate = useNavigate();
  const [sp] = useSearchParams();

  function load() {
    setLoading(true);
    const params: any = { limit: '200' };
    if (sp.get('member')) params.member = sp.get('member')!;
    if (status) params.status = status;
    const qs = new URLSearchParams(params);

    Promise.all([
      api<{ items: Membership[] }>(`/memberships?${qs}`),
      api<{ items: ExpiringItem[] }>('/notifications/expiring'),
    ])
      .then(([m, exp]) => {
        setItems(m.items);
        setExpiringList(exp.items || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [status]);

  async function handleRunAutomatedScan() {
    setRunningCron(true);
    setCronResult(null);
    try {
      const res = await api<any>('/notifications/run-cron-now', { method: 'POST' });
      setCronResult(res.results);
      load();
    } catch (err: any) {
      alert(err.message || 'Automated scan failed');
    } finally {
      setRunningCron(false);
    }
  }

  async function handleSendIndividualEmail(exp: ExpiringItem) {
    if (!exp.email) return alert('Member has no email registered');
    setSendingEmailId(exp.membershipId);
    try {
      await api('/notifications/send-single', {
        method: 'POST',
        body: JSON.stringify({
          memberId: exp.memberId,
          channel: 'email',
          to: exp.email,
          subject: `Gym Membership Expiry Reminder - ${exp.planName}`,
          customMessage: exp.defaultMessage,
        }),
      });
      alert(`Automated email sent successfully to ${exp.email}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to send email');
    } finally {
      setSendingEmailId(null);
    }
  }

  const upcoming = items.filter(
    (i) => i.status === 'active' && daysLeft(i.endDate) <= 7 && daysLeft(i.endDate) >= 0
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Memberships & Expiries</h1>
          <p className="muted">{items.length} total records · {expiringList.length} requiring renewal attention</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-outline"
            onClick={handleRunAutomatedScan}
            disabled={runningCron}
            title="Scan active memberships, send automated emails, and queue WhatsApp alerts"
          >
            <Sparkles size={16} color="var(--green)" />
            {runningCron ? 'Scanning…' : 'Run Automated Expiry Scan'}
          </button>
          <button className="btn btn-green" onClick={() => navigate('/dashboard/memberships/new')}>
            <CreditCard size={16} /> New Membership
          </button>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="alert-banner">
          <AlertTriangle size={18} />
          <span>
            <strong>{upcoming.length}</strong> active membership{upcoming.length > 1 ? 's' : ''} expiring within the next 7 days!
          </span>
        </div>
      )}

      {cronResult && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#86efac', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Automated Expiry Scan Complete:</strong> Scanned {cronResult.scanned} memberships. Sent {cronResult.emailsSent} reminder emails, and queued {cronResult.whatsappQueued} WhatsApp notifications.
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <CreditCard size={16} /> All Memberships ({items.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'expiring' ? 'active' : ''}`}
          onClick={() => setActiveTab('expiring')}
        >
          <Bell size={16} color={expiringList.length > 0 ? '#ef4444' : undefined} />
          Expiring & Overdue ({expiringList.length})
        </button>
      </div>

      {/* Tab 1: All Memberships */}
      {activeTab === 'all' && (
        <>
          <div className="filter-bar">
            <label>
              Status filter:
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="page-loading"><div className="spinner" /></div>
          ) : (
            <div className="table-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Plan</th>
                      <th>Start</th>
                      <th>Expires</th>
                      <th>Status</th>
                      <th>Days Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={6} className="empty-td">No memberships found.</td></tr>
                    ) : (
                      items.map((m) => {
                        const dl = daysLeft(m.endDate);
                        return (
                          <tr
                            key={m._id}
                            className="clickable"
                            onClick={() => navigate(`/dashboard/members/${m.member._id}`)}
                          >
                            <td>
                              <strong>{m.member.name}</strong>
                              <br />
                              <small className="muted">{m.member.phone || m.member.email}</small>
                            </td>
                            <td>
                              {m.plan.name}
                              <br />
                              <small className="muted">{money(m.plan.pricePaise)} · {m.plan.durationDays}d</small>
                            </td>
                            <td>{fmt(m.startDate)}</td>
                            <td>{fmt(m.endDate)}</td>
                            <td>
                              <span
                                className={`badge badge-${
                                  m.status === 'active' ? 'green' : m.status === 'expired' ? 'red' : 'yellow'
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                            <td>
                              {m.status === 'active' ? (
                                <span
                                  className={`badge ${
                                    dl <= 3 ? 'badge-red' : dl <= 7 ? 'badge-orange' : 'badge-green'
                                  }`}
                                >
                                  {dl <= 0 ? 'Expired Today' : `${dl} days`}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Expiring & Overdue with 1-click WhatsApp & Email */}
      {activeTab === 'expiring' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Expiry Date</th>
                  <th>Time Left</th>
                  <th style={{ textAlign: 'right' }}>Automated Reminders</th>
                </tr>
              </thead>
              <tbody>
                {expiringList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-td">
                      🎉 No memberships are expiring within the next 14 days!
                    </td>
                  </tr>
                ) : (
                  expiringList.map((exp) => (
                    <tr key={exp.membershipId}>
                      <td>
                        <strong>{exp.name}</strong>
                        {exp.phone && <br />}
                        {exp.phone && <small className="muted">{exp.phone}</small>}
                      </td>
                      <td>
                        {exp.planName}
                        <br />
                        <small className="muted">{money(exp.planPricePaise)}</small>
                      </td>
                      <td>{fmt(exp.endDate)}</td>
                      <td>
                        <span
                          className={`badge ${
                            exp.daysRemaining < 0
                              ? 'badge-red'
                              : exp.daysRemaining === 0
                              ? 'badge-red'
                              : exp.daysRemaining <= 3
                              ? 'badge-orange'
                              : 'badge-yellow'
                          }`}
                        >
                          {exp.daysRemaining < 0
                            ? `Expired ${Math.abs(exp.daysRemaining)}d ago`
                            : exp.daysRemaining === 0
                            ? 'Expires Today'
                            : `${exp.daysRemaining} days left`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-sm whatsapp-btn"
                            onClick={() => window.open(exp.whatsappUrl, '_blank')}
                            title="Send Expiry Alert via WhatsApp"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleSendIndividualEmail(exp)}
                            disabled={sendingEmailId === exp.membershipId || !exp.email}
                            title={exp.email ? `Send Email to ${exp.email}` : 'No email address registered'}
                          >
                            <Mail size={13} /> {sendingEmailId === exp.membershipId ? 'Sending…' : 'Email'}
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
    </div>
  );
}
