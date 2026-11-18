import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, money } from '../api';
import {
  ArrowLeft,
  UserPlus,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
  Mail,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Tag,
  Clock,
  UserCheck
} from 'lucide-react';

interface Plan {
  _id: string;
  name: string;
  pricePaise: number;
  durationDays: number;
  features?: string[];
  description?: string;
  active?: boolean;
}

export default function AddMemberPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'member'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<{
    memberId: string;
    emailSent: boolean;
    emailMessage?: string;
  } | null>(null);

  // Fetch active membership plans
  useEffect(() => {
    let mounted = true;
    api<{ items: Plan[] }>('/plans')
      .then(res => {
        if (!mounted) return;
        const activePlans = (res.items || []).filter(p => p.active !== false);
        setPlans(activePlans);
        // Default to first active plan if member role
        if (activePlans.length > 0) {
          setSelectedPlanId(activePlans[0]._id);
        }
      })
      .catch(err => {
        console.error('Failed to load plans:', err);
      })
      .finally(() => {
        if (mounted) setLoadingPlans(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  // Quick Random Password Generator
  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let randomStr = '';
    for (let i = 0; i < 5; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `FV@${randomStr}`;
    set('password', generated);
    setShowPassword(true);
  }

  // Calculate live expiry date
  const selectedPlan = plans.find(p => p._id === selectedPlanId);
  let calculatedExpiryDateStr = '—';
  if (selectedPlan) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + (selectedPlan.durationDays || 30));
    calculatedExpiryDateStr = end.toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        password: form.password,
        sendWelcomeEmail: sendWelcomeEmail,
      };

      if (form.role === 'member' && selectedPlanId) {
        payload.planId = selectedPlanId;
        payload.startDate = startDate || new Date().toISOString();
      }

      const res = await api<{
        item: { _id: string; id: string };
        emailSent?: boolean;
        message?: string;
        emailError?: string;
      }>('/members', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const memberId = res.item._id || res.item.id;
      setSuccessResult({
        memberId,
        emailSent: !!res.emailSent,
        emailMessage: res.message
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'सदस्य बनाने में विफल');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> वापस जाएं (Back)
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <UserPlus className="text-accent" size={28} />
            नया सदस्य जोड़ें (Add New Member)
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }} className="text-secondary">
            सदस्य का विवरण दर्ज करें। सदस्य को स्वतः स्वागत ईमेल, सदस्यता विवरण व लॉगिन पासवर्ड भेजा जाएगा।
          </p>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {successResult && (
        <div
          style={{
            background: 'linear-gradient(135deg, #101c12 0%, #152618 100%)',
            border: '2px solid #b5f23d',
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 28,
            boxShadow: '0 10px 25px rgba(181, 242, 61, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <CheckCircle2 size={36} color="#b5f23d" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: '#b5f23d', fontWeight: 800 }}>
                🎉 सदस्य सफलतापूर्वक जोड़ दिया गया!
              </h2>
              <p style={{ margin: '8px 0 16px', color: '#e5e7eb', fontSize: 14, lineHeight: 1.6 }}>
                {successResult.emailSent ? (
                  <>
                    सदस्य <strong>{form.name}</strong> का खाता सक्रिय हो गया है और उनके ईमेल <strong>{form.email}</strong> पर
                    लॉगिन आईडी, पासवर्ड व सदस्यता प्लान की जानकारी सफलतापूर्वक भेज दी गई है।
                  </>
                ) : (
                  <>
                    सदस्य खाता सफलतापूर्वक बनाया गया। (ईमेल सूचना: {successResult.emailMessage || 'समीक्षाधीन'})
                  </>
                )}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-green"
                  onClick={() => navigate(`/dashboard/members/${successResult.memberId}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
                >
                  <UserCheck size={16} /> सदस्य प्रोफाइल देखें (View Profile)
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setSuccessResult(null);
                    setForm({ name: '', email: '', phone: '', password: '', role: 'member' });
                    setSelectedPlanId(plans[0]?._id || '');
                  }}
                  style={{ padding: '10px 20px' }}
                >
                  + एक और सदस्य जोड़ें (Add Another)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Form & Email Preview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* Left Column: Member Details Form */}
        <div className="card" style={{ padding: 24, background: '#0e1410', border: '1px solid #1f2a21', borderRadius: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="#b5f23d" /> सदस्य पंजीकरण विवरण (Personal Info)
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 6 }}>
                सदस्य का नाम (Full Name) *
              </label>
              <input
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="उदा. राहुल शर्मा (Rahul Sharma)"
                className="input"
                style={{ width: '100%', padding: '10px 14px', background: '#070a08', border: '1px solid #233125', borderRadius: 8, color: '#fff' }}
              />
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 6 }}>
                ईमेल आईडी (Email Address) *
              </label>
              <input
                type="email"
                required
                maxLength={254}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="member@gmail.com"
                className="input"
                style={{ width: '100%', padding: '10px 14px', background: '#070a08', border: '1px solid #233125', borderRadius: 8, color: '#fff' }}
              />
              <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
                लॉगिन क्रेडेंशियल्स और प्लान की सूचना इसी ईमेल पर भेजी जाएगी।
              </span>
            </div>

            {/* Phone Number */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 6 }}>
                मोबाइल नंबर (Phone Number)
              </label>
              <input
                maxLength={25}
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="input"
                style={{ width: '100%', padding: '10px 14px', background: '#070a08', border: '1px solid #233125', borderRadius: 8, color: '#fff' }}
              />
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 6 }}>
                भूमिका (Role)
              </label>
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className="input"
                style={{ width: '100%', padding: '10px 14px', background: '#070a08', border: '1px solid #233125', borderRadius: 8, color: '#fff' }}
              >
                <option value="member">सदस्य (Member)</option>
                <option value="trainer">ट्रेनर (Trainer)</option>
                <option value="staff">स्टाफ (Staff)</option>
              </select>
            </div>

            {/* Password Field with Generator & Toggle */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db', margin: 0 }}>
                  लॉगिन पासवर्ड (Initial Password) *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b5f23d',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 6px'
                  }}
                >
                  <Sparkles size={13} /> पासवर्ड जनरेट करें
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  maxLength={128}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="कम से कम 6 अक्षर या ऊपर से जनरेट करें"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px 42px 10px 14px',
                    background: '#070a08',
                    border: '1px solid #233125',
                    borderRadius: 8,
                    color: '#fff',
                    fontFamily: showPassword ? 'monospace' : 'inherit',
                    fontSize: 14
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: 4
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Membership Plan Selection (If Role is Member) */}
            {form.role === 'member' && (
              <div style={{ marginTop: 8, padding: 16, background: '#090d0a', border: '1px solid #1f2a21', borderRadius: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#b5f23d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={16} /> सदस्यता प्लान का चयन (Select Plan)
                </h3>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                    प्लान चुनें
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={e => setSelectedPlanId(e.target.value)}
                    className="input"
                    disabled={loadingPlans}
                    style={{ width: '100%', padding: '9px 12px', background: '#101512', border: '1px solid #233125', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  >
                    <option value="">-- कोई प्लान नहीं (बाद में जोड़ें) --</option>
                    {plans.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.durationDays} दिन) — {money(p.pricePaise)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPlan && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                        शुरुआती तिथि (Start Date)
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="input"
                        style={{ width: '100%', padding: '8px 10px', background: '#101512', border: '1px solid #233125', borderRadius: 8, color: '#fff', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                        समाप्ति तिथि (Expiry Date)
                      </label>
                      <div
                        style={{
                          padding: '9px 10px',
                          background: '#101512',
                          border: '1px solid #233125',
                          borderRadius: 8,
                          color: '#b5f23d',
                          fontWeight: 700,
                          fontSize: 13
                        }}
                      >
                        {calculatedExpiryDateStr}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Checkbox: Send Welcome Email */}
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox"
                id="sendWelcomeEmail"
                checked={sendWelcomeEmail}
                onChange={e => setSendWelcomeEmail(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#b5f23d', cursor: 'pointer', width: 16, height: 16 }}
              />
              <label htmlFor="sendWelcomeEmail" style={{ fontSize: 13, color: '#e5e7eb', cursor: 'pointer', lineHeight: 1.4 }}>
                <strong>सदस्य को ईमेल पर लॉगिन पासवर्ड व सदस्यता विवरण भेजें</strong>
                <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  सदस्य का नाम, प्लान, समाप्ति तिथि, सक्रिय स्थिति और पोर्टल लॉगिन पासवर्ड ईमेल पर तुरंत भेजा जाएगा।
                </span>
              </label>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate(-1)}
                style={{ flex: 1, padding: '12px' }}
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="submit"
                className="btn btn-green"
                disabled={loading}
                style={{ flex: 2, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
              >
                <UserPlus size={16} />
                {loading ? 'सहेजा जा रहा है...' : 'सदस्य जोड़ें (Create Member)'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Email Preview Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: '#0d130f',
              border: '1px solid #233125',
              borderRadius: 12,
              padding: 22,
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid #1f2a21', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={18} color="#b5f23d" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>ईमेल पूर्वावलोकन (Email Preview)</span>
              </div>
              <span style={{ fontSize: 11, background: 'rgba(181, 242, 61, 0.15)', color: '#b5f23d', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                100% हिंदी ईमेल
              </span>
            </div>

            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px', lineHeight: 1.5 }}>
              जब आप सदस्य जोड़ेंगे, तब सदस्य को ठीक इस प्रारूप में आधिकारिक स्वागत ईमेल प्राप्त होगा:
            </p>

            {/* Email Card Simulation */}
            <div
              style={{
                background: '#070a08',
                border: '1px solid #1f2a21',
                borderRadius: 10,
                padding: 16,
                fontSize: 13
              }}
            >
              <div style={{ textAlign: 'center', borderBottom: '1px solid #1a241c', paddingBottom: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: '#1a271c', color: '#b5f23d', border: '1px solid #b5f23d', padding: '3px 8px', borderRadius: 12, letterSpacing: 0.5 }}>
                  🎉 स्वागतम् · FITNESS VILLA
                </span>
                <h4 style={{ margin: '8px 0 2px', fontSize: 16, color: '#fff' }}>फिटनेस विला (Fitness Villa)</h4>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>सदस्यता पंजीकरण सफल</span>
              </div>

              <p style={{ margin: '0 0 12px', color: '#e5e7eb' }}>
                नमस्ते <strong style={{ color: '#b5f23d' }}>{form.name || 'राहुल शर्मा'}</strong> जी 🙏,<br />
                फिटनेस विला परिवार में आपका हार्दिक स्वागत है! आपका नया सदस्य खाता सक्रिय कर दिया गया है:
              </p>

              {/* 4 Required Membership Details */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, background: '#0b100d', borderRadius: 8, overflow: 'hidden' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #19221b' }}>
                    <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 12 }}>सदस्य का नाम (Member Name)</td>
                    <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 700, textAlign: 'right', fontSize: 12 }}>
                      {form.name || 'राहुल शर्मा'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #19221b' }}>
                    <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 12 }}>सदस्यता प्लान (Plan)</td>
                    <td style={{ padding: '8px 12px', color: '#b5f23d', fontWeight: 700, textAlign: 'right', fontSize: 12 }}>
                      {selectedPlan?.name || 'मानक सदस्यता (Standard Access)'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #19221b' }}>
                    <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 12 }}>समाप्ति तिथि (Expiry Date)</td>
                    <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 700, textAlign: 'right', fontSize: 12 }}>
                      {calculatedExpiryDateStr}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 12 }}>वर्तमान स्थिति (Status)</td>
                    <td style={{ padding: '8px 12px', color: '#b5f23d', fontWeight: 700, textAlign: 'right', fontSize: 12 }}>
                      सक्रिय (Active)
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 5th Required Point: Login Credentials Box */}
              <div style={{ background: '#101813', border: '1px solid #283e23', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b5f23d', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={14} /> 🔐 सदस्य पोर्टल लॉगिन विवरण (Login Credentials)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 4, fontSize: 12 }}>
                  <span style={{ color: '#9ca3af' }}>लॉगिन आईडी:</span>
                  <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{form.email || 'member@gmail.com'}</span>
                  <span style={{ color: '#9ca3af' }}>लॉगिन पासवर्ड:</span>
                  <span style={{ color: '#b5f23d', fontFamily: 'monospace', fontWeight: 800, letterSpacing: 1 }}>
                    {form.password || '••••••••'}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '14px 0 8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#b5f23d',
                    color: '#090d0a',
                    fontWeight: 800,
                    fontSize: 12,
                    padding: '8px 18px',
                    borderRadius: 6,
                    textTransform: 'uppercase'
                  }}
                >
                  पोर्टल में लॉगिन करें (Member Login) →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
