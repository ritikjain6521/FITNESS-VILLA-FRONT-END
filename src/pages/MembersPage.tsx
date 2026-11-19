import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmt } from '../api';
import {
  Search,
  UserPlus,
  ChevronRight,
  Trash2,
  Mail,
  Send,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

type Member = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  createdAt: string;
};

export default function MembersPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const limit = 20;

  // Email Modal State
  const [emailModalMember, setEmailModalMember] = useState<Member | null>(null);
  const [emailType, setEmailType] = useState<'welcome' | 'custom'>('welcome');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  function load(p = 1, s = search) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit), ...(s ? { search: s } : {}) });
    api<{ items: Member[]; total: number }>(`/members?${params}`)
      .then(r => {
        setItems(r.items);
        setTotal(r.total);
        setPage(p);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1, '');
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(1, search);
  }

  async function deleteMember(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!window.confirm(`क्या आप वाकई सदस्य "${name}" को हटाना / निष्क्रिय करना चाहते हैं?`)) return;
    try {
      await api(`/members/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(m => m._id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (err: any) {
      alert(err.message || 'सदस्य हटाने में विफल');
    }
  }

  // Open Email Modal
  function openEmailModal(member: Member) {
    setEmailModalMember(member);
    setEmailType('welcome');
    setEmailSubject('🎉 फिटनेस विला - सदस्यता विवरण एवं पोर्टल लॉगिन जानकारी');
    setEmailMessage('');
    setNewPassword('');
    setShowPassword(false);
    setEmailStatus(null);
  }

  // Quick Random Password Generator
  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let randomStr = '';
    for (let i = 0; i < 5; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `FV@${randomStr}`;
    setNewPassword(generated);
    setShowPassword(true);
  }

  // Apply Pre-made Template
  function handleSelectTemplate(key: string) {
    if (!emailModalMember) return;
    const name = emailModalMember.name;
    if (key === 'general') {
      setEmailSubject('महत्वपूर्ण सूचना - फिटनेस विला (Fitness Villa)');
      setEmailMessage(`नमस्ते ${name} जी 🙏,\n\nफिटनेस विला प्रबंधन की ओर से यह आवश्यक सूचना आपके ध्यानार्थ प्रेषित की जा रही है।\nकृपया नियमित रूप से वर्कआउट करते रहें और अपने स्वास्थ्य का ध्यान रखें।\n\nकिसी भी सहायता या जानकारी के लिए जिम रिसेप्शन पर संपर्क करें।`);
    } else if (key === 'diet') {
      setEmailSubject('फिटनेस व डाइट परामर्श सूचना - फिटनेस विला');
      setEmailMessage(`नमस्ते ${name} जी 🙏,\n\nआपकी फिटनेस प्रगति को और बेहतर बनाने के लिए फिटनेस विला के प्रमाणित ट्रेनर्स द्वारा डाइट व वर्कआउट गाइडेंस उपलब्ध है।\n\nकृपया अपने ट्रेनर से मिलकर अपना पर्सनलाइज्ड वर्कआउट शेड्यूल बनवाएं।`);
    } else if (key === 'timing') {
      setEmailSubject('जिम समय सारिणी एवं अवकाश सूचना - फिटनेस विला');
      setEmailMessage(`नमस्ते ${name} जी 🙏,\n\nकृपया ध्यान दें: जिम के समय में आगामी परिवर्तन / विशेष अवकाश की सूचना निम्नवत है:\n\nसमय: प्रातः 06:00 से 11:00 बजे | सायं 05:00 से 10:00 बजे\n\nअसुविधा के लिए खेद है। आपका सहयोग प्रार्थनीय है।`);
    } else if (key === 'renewal') {
      setEmailSubject('सदस्यता रिन्युअल सूचना - फिटनेस विला');
      setEmailMessage(`नमस्ते ${name} जी 🙏,\n\nफिटनेस विला में आपकी सदस्यता की निरंतरता बनाए रखने के लिए यह स्मरण पत्र भेजा जा रहा है।\nअपनी ट्रेनिंग को बिना रुकावट जारी रखने के लिए कृपया समय पर रिसेप्शन पर संपर्क कर सदस्यता का नवीनीकरण करवाएं।`);
    }
  }

  // Send Email Action
  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailModalMember) return;
    if (!emailModalMember.email) {
      setEmailStatus({ success: false, message: 'इस सदस्य का कोई ईमेल पंजीकृत नहीं है।' });
      return;
    }

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const payload: any = {
        type: emailType,
        subject: emailSubject.trim() || undefined,
      };

      if (emailType === 'custom') {
        if (!emailMessage.trim()) {
          throw new Error('कृपया संदेश लिखें');
        }
        payload.message = emailMessage.trim();
      } else {
        if (newPassword.trim()) {
          payload.password = newPassword.trim();
        }
      }

      const res = await api<{ success: boolean; message: string }>(`/members/${emailModalMember._id}/send-email`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setEmailStatus({
        success: true,
        message: res.message || `ईमेल सफलतापूर्वक ${emailModalMember.email} पर भेज दिया गया!`
      });

      // Auto close after 2 seconds
      setTimeout(() => {
        setEmailModalMember(null);
      }, 2000);
    } catch (err: any) {
      setEmailStatus({
        success: false,
        message: err instanceof Error ? err.message : 'ईमेल भेजने में विफल'
      });
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>सदस्य सूची (Members)</h1>
          <p className="muted">कुल सदस्य: <strong>{total}</strong></p>
        </div>
        <div className="page-actions">
          <button className="btn btn-green" onClick={() => navigate('/dashboard/members/new')}>
            <UserPlus size={16} /> नया सदस्य जोड़ें (Add Member)
          </button>
        </div>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="नाम, ईमेल या फोन से खोजें (Search by name, email or phone)…"
          />
        </div>
        <button className="btn btn-outline" type="submit">खोजें (Search)</button>
      </form>

      {error && <p className="error-msg">{error}</p>}

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
                  <th>नाम (Name)</th>
                  <th>ईमेल (Email)</th>
                  <th>फोन (Phone)</th>
                  <th>भूमिका (Role)</th>
                  <th>स्थिति (Status)</th>
                  <th>पंजीकरण (Joined)</th>
                  <th style={{ textAlign: 'right' }}>कार्यवाही (Actions)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-td">
                      कोई सदस्य नहीं मिला (No members found).
                    </td>
                  </tr>
                ) : (
                  items.map(m => (
                    <tr
                      key={m._id}
                      className="clickable"
                      onClick={() => navigate(`/dashboard/members/${m._id}`)}
                    >
                      <td>
                        <strong>{m.name}</strong>
                      </td>
                      <td>
                        <span style={{ color: m.email ? '#e5e7eb' : '#6b7280' }}>
                          {m.email || '—'}
                        </span>
                      </td>
                      <td>{m.phone || '—'}</td>
                      <td>
                        <span className="pill">{m.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${m.active ? 'badge-green' : 'badge-red'}`}>
                          {m.active ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}
                        </span>
                      </td>
                      <td>{fmt(m.createdAt)}</td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {/* Send Email Button */}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              borderColor: '#3b82f6',
                              color: '#60a5fa',
                              background: 'rgba(59, 130, 246, 0.1)',
                              cursor: 'pointer'
                            }}
                            onClick={() => openEmailModal(m)}
                            title="सदस्य को ईमेल भेजें (Send Email to Member)"
                          >
                            <Mail size={13} /> ईमेल भेजें (Email)
                          </button>

                          {/* Delete / Deactivate Button */}
                          <button
                            type="button"
                            className="icon-btn danger"
                            style={{ padding: '6px' }}
                            onClick={e => deleteMember(e, m._id, m.name)}
                            title="सदस्य हटाएं (Delete Member)"
                          >
                            <Trash2 size={14} />
                          </button>

                          <ChevronRight size={16} className="muted" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => load(page - 1)}
            >
              Previous
            </button>
            <span className="muted">
              Page {page} of {Math.ceil(total / limit) || 1}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={page * limit >= total}
              onClick={() => load(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {emailModalMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setEmailModalMember(null)}
        >
          <div
            style={{
              background: '#0e1410',
              border: '1px solid #233125',
              borderRadius: 14,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #1f2a21', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(96, 165, 250, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} color="#60a5fa" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 700 }}>
                    सदस्य को ईमेल भेजें (Send Email)
                  </h3>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    100% शुद्ध हिंदी आधिकारिक ईमेल सीधे इनबॉक्स में भेजें
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalMember(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Recipient Card */}
            <div
              style={{
                background: '#070a08',
                border: '1px solid #1f2a21',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13
              }}
            >
              <div>
                <span style={{ color: '#9ca3af' }}>प्राप्तकर्ता (To): </span>
                <strong style={{ color: '#b5f23d' }}>{emailModalMember.name}</strong>
              </div>
              <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
                {emailModalMember.email || '(ईमेल उपलब्ध नहीं)'}
              </span>
            </div>

            {/* Email Type Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setEmailType('welcome');
                  setEmailSubject('🎉 फिटनेस विला - सदस्यता विवरण एवं पोर्टल लॉगिन जानकारी');
                }}
                style={{
                  padding: '10px',
                  borderRadius: 8,
                  border: `1px solid ${emailType === 'welcome' ? '#b5f23d' : '#233125'}`,
                  background: emailType === 'welcome' ? 'rgba(181, 242, 61, 0.1)' : '#101512',
                  color: emailType === 'welcome' ? '#b5f23d' : '#9ca3af',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <ShieldCheck size={15} /> सदस्यता व लॉगिन पत्र
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailType('custom');
                  setEmailSubject('महत्वपूर्ण सूचना - फिटनेस विला');
                }}
                style={{
                  padding: '10px',
                  borderRadius: 8,
                  border: `1px solid ${emailType === 'custom' ? '#60a5fa' : '#233125'}`,
                  background: emailType === 'custom' ? 'rgba(96, 165, 250, 0.1)' : '#101512',
                  color: emailType === 'custom' ? '#60a5fa' : '#9ca3af',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Mail size={15} /> कस्टम संदेश / सूचना
              </button>
            </div>

            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Mode 1: Welcome & Credentials Info */}
              {emailType === 'welcome' && (
                <div style={{ background: '#090d0a', border: '1px solid #1f2a21', borderRadius: 8, padding: 14, fontSize: 13 }}>
                  <p style={{ margin: '0 0 10px', color: '#d1d5db', lineHeight: 1.5 }}>
                    इस विकल्प से सदस्य को <strong>सदस्य का नाम, प्लान, समाप्ति तिथि, सक्रिय स्थिति और पोर्टल लॉगिन लिंक</strong> वाला लक्ज़री हिंदी ईमेल भेजा जाएगा।
                  </p>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', margin: 0 }}>
                        नया पासवर्ड भेजें (वैकल्पिक / Optional Password):
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#b5f23d',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3
                        }}
                      >
                        <Sparkles size={12} /> पासवर्ड जनरेट करें
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="यदि पासवर्ड रीसेट करके ईमेल में भेजना है तो दर्ज करें"
                        style={{
                          width: '100%',
                          padding: '8px 36px 8px 10px',
                          background: '#101512',
                          border: '1px solid #233125',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 13,
                          fontFamily: showPassword ? 'monospace' : 'inherit'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          padding: 2
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginTop: 4 }}>
                      * यदि आप पासवर्ड खाली छोड़ते हैं, तो सदस्य को केवल सदस्यता विवरण व लॉगिन लिंक भेजा जाएगा।
                    </span>
                  </div>
                </div>
              )}

              {/* Mode 2: Custom Notice Form */}
              {emailType === 'custom' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                      रेडी-मेड टेम्पलेट चुनें:
                    </label>
                    <select
                      onChange={e => handleSelectTemplate(e.target.value)}
                      defaultValue=""
                      style={{ width: '100%', padding: '8px 10px', background: '#101512', border: '1px solid #233125', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    >
                      <option value="">-- टेम्पलेट चुनें (वैकल्पिक) --</option>
                      <option value="general">📢 सामान्य सूचना (General Notice)</option>
                      <option value="diet">🥗 फिटनेस व डाइट परामर्श (Fitness Guidance)</option>
                      <option value="timing">⏰ जिम समय सारिणी / अवकाश सूचना (Gym Timing / Holiday)</option>
                      <option value="renewal">⏳ सदस्यता रिन्युअल सूचना (Renewal Reminder)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                      ईमेल विषय (Subject) *
                    </label>
                    <input
                      required
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="उदा. महत्वपूर्ण सूचना - फिटनेस विला"
                      style={{ width: '100%', padding: '8px 10px', background: '#101512', border: '1px solid #233125', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                      संदेश सामग्री (Message Body in Hindi) *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={emailMessage}
                      onChange={e => setEmailMessage(e.target.value)}
                      placeholder="यहाँ सदस्य के लिए हिंदी में संदेश लिखें..."
                      style={{ width: '100%', padding: '8px 10px', background: '#101512', border: '1px solid #233125', borderRadius: 6, color: '#fff', fontSize: 13, resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              {/* Status Banner */}
              {emailStatus && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: emailStatus.success ? 'rgba(181, 242, 61, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${emailStatus.success ? '#b5f23d' : '#ef4444'}`,
                    color: emailStatus.success ? '#b5f23d' : '#ef4444'
                  }}
                >
                  {emailStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{emailStatus.message}</span>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEmailModalMember(null)}
                  style={{ flex: 1, padding: '10px' }}
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="submit"
                  className="btn btn-green"
                  disabled={sendingEmail || !emailModalMember.email}
                  style={{ flex: 2, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={15} />
                  {sendingEmail ? 'भेजा जा रहा है...' : 'ईमेल भेजें (Send Email)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
