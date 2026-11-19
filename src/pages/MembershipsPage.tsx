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
  Trash2,
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
  emailSubject?: string;
  emailHtml?: string;
};

export default function MembershipsPage() {
  const [sp] = useSearchParams();
  const initialTab = sp.get('tab') === 'expiring' ? 'expiring' : 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>(initialTab);
  const [items, setItems] = useState<Membership[]>([]);
  const [expiringList, setExpiringList] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [runningCron, setRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const navigate = useNavigate();

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

  useEffect(() => {
    if (sp.get('tab') === 'expiring') {
      setActiveTab('expiring');
    }
  }, [sp]);

  async function handleRunAutomatedScan() {
    setRunningCron(true);
    setCronResult(null);
    try {
      const res = await api<any>('/notifications/run-cron-now', { method: 'POST' });
      setCronResult(res.results);
      load();
    } catch (err: any) {
      alert(err.message || 'स्वचालित स्कैन में त्रुटि हुई');
    } finally {
      setRunningCron(false);
    }
  }

  async function handleSendIndividualEmail(exp: ExpiringItem) {
    if (!exp.email) return alert('सदस्य का कोई ईमेल पता पंजीकृत नहीं है!');
    setSendingEmailId(exp.membershipId);
    try {
      const res = await api<{ message: string; isLive?: boolean }>('/notifications/send-single', {
        method: 'POST',
        body: JSON.stringify({
          memberId: exp.memberId,
          channel: 'email',
          to: exp.email,
          subject: exp.emailSubject || `अति आवश्यक: ${exp.name} जी, आपकी फिटनेस विला जिम सदस्यता समाप्त हो रही है`,
          customMessage: exp.defaultMessage,
          html: exp.emailHtml,
        }),
      });
      alert(res.message || `हिंदी ईमेल सफलतापूर्वक ${exp.email} पर भेज दिया गया!`);
    } catch (err: any) {
      alert(err.message || 'ईमेल भेजने में त्रुटि हुई');
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleDeleteMembership(e: React.MouseEvent, id: string, memberName: string) {
    e.stopPropagation();
    if (!window.confirm(`क्या आप वाकई "${memberName}" के सदस्यता रिकॉर्ड को हटाना चाहते हैं?`)) return;
    try {
      await api(`/memberships/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((m) => m._id !== id));
      load();
    } catch (err: any) {
      alert(err.message || 'रिकॉर्ड हटाने में त्रुटि हुई');
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
            {runningCron ? 'स्कैन जारी है…' : 'स्वचालित स्कैन चलाएं (Run Auto Scan)'}
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
            <strong>{upcoming.length}</strong> सदस्यता{upcoming.length > 1 ? 'एं' : ''} अगले 7 दिनों में समाप्त हो रही हैं!
          </span>
        </div>
      )}

      {cronResult && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#86efac', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>स्वचालित स्कैन संपन्न:</strong> कुल {cronResult.scanned} सदस्यताओं को जांचा गया। {cronResult.emailsSent} रिमाइंडर ईमेल भेजे गए, और {cronResult.whatsappQueued} व्हाट्सएप सूचनाएं तैयार की गईं।
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
          समाप्ति एवं बकाया (Expiring & Overdue) ({expiringList.length})
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
            <div className="page-loading">
              <div className="spinner" />
              <span>Loading memberships…</span>
            </div>
          ) : (
            <div className="table-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Plan</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Days Left</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-td">
                          No memberships found.
                        </td>
                      </tr>
                    ) : (
                      items.map((m) => {
                        const dl = daysLeft(m.endDate);
                        return (
                          <tr key={m._id} className="clickable" onClick={() => navigate(`/dashboard/members/${m.member._id}`)}>
                            <td>
                              <strong>{m.member.name}</strong>
                              <br />
                              <small className="muted">{m.member.email}</small>
                            </td>
                            <td>
                              {m.plan?.name ?? '—'}
                              <br />
                              <small className="muted">{money(m.plan?.pricePaise ?? 0)}</small>
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
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="icon-btn danger"
                                style={{ padding: '6px' }}
                                onClick={(e) => handleDeleteMembership(e, m._id, m.member.name)}
                                title="Delete / Cancel Membership"
                              >
                                <Trash2 size={13} />
                              </button>
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

      {/* Tab 2: Expiring & Overdue with 100% Hindi WhatsApp & Email */}
      {activeTab === 'expiring' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 28, 22, 0.95), rgba(12, 17, 13, 0.95))',
            border: '1px solid rgba(181, 242, 61, 0.25)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)', fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Sparkles size={16} /> 100% शुद्ध हिंदी स्वचालित रिमाइंडर (1-Click Hindi Reminders)
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#c5ccc2' }}>
                समाप्त होने वाली व समाप्त (Overdue) सदस्यताओं के लिए एक क्लिक में <strong>हिंदी WhatsApp</strong> व <strong>हिंदी ईमेल (Email)</strong> भेजें।
              </p>
            </div>
            <button
              className="btn btn-green btn-sm"
              onClick={handleRunAutomatedScan}
              disabled={runningCron}
            >
              <Sparkles size={14} />
              {runningCron ? 'स्कैन जारी है…' : 'सभी को स्वतः सूचना भेजें (Auto Scan)'}
            </button>
          </div>

          <div className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>सदस्य (Member)</th>
                    <th>प्लान (Plan)</th>
                    <th>समाप्ति तिथि (Expiry)</th>
                    <th>स्थिति (Status)</th>
                    <th style={{ textAlign: 'right' }}>हिंदी सूचना भेजें (Send Reminder)</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-td" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        🎉 अगले 14 दिनों में कोई भी सदस्यता समाप्त नहीं हो रही है!
                      </td>
                    </tr>
                  ) : (
                    expiringList.map((exp) => (
                      <tr key={exp.membershipId}>
                        <td>
                          <strong style={{ fontSize: '14px', color: '#fff' }}>{exp.name}</strong>
                          {exp.phone && <br />}
                          {exp.phone && <small className="muted">📞 {exp.phone}</small>}
                          {exp.email && <br />}
                          {exp.email && <small className="muted" style={{ color: '#889085' }}>✉️ {exp.email}</small>}
                        </td>
                        <td>
                          <strong style={{ color: '#e5e7eb' }}>{exp.planName}</strong>
                          <br />
                          <small className="muted">{money(exp.planPricePaise)}</small>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{fmt(exp.endDate)}</span>
                        </td>
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
                            style={{ fontWeight: 700 }}
                          >
                            {exp.daysRemaining < 0
                              ? `🛑 समाप्त (${Math.abs(exp.daysRemaining)} दिन पहले)`
                              : exp.daysRemaining === 0
                              ? '⚠️ आज समाप्त (Today)'
                              : `⏳ ${exp.daysRemaining} दिन शेष`}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-sm whatsapp-btn"
                              onClick={() => window.open(exp.whatsappUrl, '_blank')}
                              title="हिंदी में WhatsApp संदेश भेजें"
                            >
                              <MessageSquare size={13} /> WhatsApp (हिंदी)
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ borderColor: exp.email ? 'rgba(181, 242, 61, 0.4)' : undefined }}
                              onClick={() => handleSendIndividualEmail(exp)}
                              disabled={sendingEmailId === exp.membershipId || !exp.email}
                              title={exp.email ? `हिंदी ईमेल भेजें: ${exp.email}` : 'सदस्य का ईमेल पंजीकृत नहीं है'}
                            >
                              <Mail size={13} /> {sendingEmailId === exp.membershipId ? 'भेज रहे हैं…' : 'हिंदी ईमेल भेजें'}
                            </button>
                            <button
                              className="icon-btn danger"
                              style={{ padding: '6px' }}
                              onClick={(e) => handleDeleteMembership(e, exp.membershipId, exp.name)}
                              title="सदस्यता रिकॉर्ड हटाएं"
                            >
                              <Trash2 size={13} />
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
        </div>
      )}
    </div>
  );
}
