import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { User, Phone, MapPin, Heart, Shield, Bell, Lock, CheckCircle, AlertTriangle, Edit3 } from 'lucide-react';

type UserProfile = {
  id: string; name: string; email: string; phone?: string; role: string;
  active: boolean; status: string; statusReason?: string; createdAt: string;
  assignedTrainer?: { name: string; email: string; phone?: string };
};
type MemberDoc = {
  address?: string; dateOfBirth?: string; gender?: string; bloodGroup?: string;
  emergencyContact?: { name: string; phone: string; relation: string };
  notificationPrefs?: { sms: boolean; email: boolean; whatsapp: boolean };
};

export default function MemberProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberDoc, setMemberDoc] = useState<MemberDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'profile' | 'edit' | 'password' | 'notifications'>('profile');

  // Edit form state
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [dob, setDob] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRelation, setEcRelation] = useState('');
  const [sms, setSms] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const fetchProfile = () => {
    api<{ item: UserProfile; memberDetails: MemberDoc | null }>('/members/me/profile')
      .then(r => {
        setProfile(r.item);
        setMemberDoc(r.memberDetails);
        // Populate form fields
        setPhone(r.item.phone || '');
        if (r.memberDetails) {
          setAddress(r.memberDetails.address || '');
          setBloodGroup(r.memberDetails.bloodGroup || '');
          setDob(r.memberDetails.dateOfBirth ? new Date(r.memberDetails.dateOfBirth).toISOString().split('T')[0] : '');
          setEcName(r.memberDetails.emergencyContact?.name || '');
          setEcPhone(r.memberDetails.emergencyContact?.phone || '');
          setEcRelation(r.memberDetails.emergencyContact?.relation || '');
          setSms(r.memberDetails.notificationPrefs?.sms ?? true);
          setEmailNotif(r.memberDetails.notificationPrefs?.email ?? true);
          setWhatsapp(r.memberDetails.notificationPrefs?.whatsapp ?? false);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const notify = (msg: string, isError = false) => {
    if (isError) { setSaveError(msg); setSaveSuccess(''); }
    else { setSaveSuccess(msg); setSaveError(''); }
    setTimeout(() => { setSaveSuccess(''); setSaveError(''); }, 4000);
  };

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/members/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          phone, address, bloodGroup,
          dateOfBirth: dob || undefined,
          emergencyContact: { name: ecName, phone: ecPhone, relation: ecRelation },
          notificationPrefs: { sms, email: emailNotif, whatsapp },
        }),
      });
      notify('Profile updated successfully!');
      fetchProfile();
      setTab('profile');
    } catch (e: any) {
      notify(e.message, true);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { notify('New passwords do not match.', true); return; }
    if (newPassword.length < 8) { notify('Password must be at least 8 characters.', true); return; }
    setSaving(true);
    try {
      await api('/members/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      notify('Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      notify(e.message, true);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/members/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ notificationPrefs: { sms, email: emailNotif, whatsapp } }),
      });
      notify('Notification preferences saved!');
    } catch (e: any) {
      notify(e.message, true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (error) return <div className="page-error"><AlertTriangle size={24} />{error}</div>;
  if (!profile) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p className="muted">{profile.email} &nbsp;·&nbsp; <span className="pill">{profile.role}</span></p>
        </div>
        <div className="page-actions">
          {tab !== 'edit' && (
            <button className="btn btn-green" onClick={() => setTab('edit')}>
              <Edit3 size={15} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Feedback banners */}
      {saveSuccess && (
        <div className="status-banner status-green" style={{ marginBottom: 16 }}>
          <CheckCircle size={16} /><span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="status-banner status-red" style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} /><span>{saveError}</span>
        </div>
      )}

      {/* Account status alert */}
      {profile.status !== 'active' && (
        <div className="status-banner status-red" style={{ marginBottom: 16 }}>
          <Shield size={16} />
          <span>
            Account <strong>{profile.status}</strong>
            {profile.statusReason ? `: ${profile.statusReason}` : ''}. Please contact gym reception.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {([
          { key: 'profile', label: 'Overview', icon: User },
          { key: 'edit', label: 'Edit Info', icon: Edit3 },
          { key: 'password', label: 'Password', icon: Lock },
          { key: 'notifications', label: 'Notifications', icon: Bell },
        ] as { key: typeof tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div className="dash-card">
            <h3><User size={15} style={{ marginRight: 8 }} />Personal Information</h3>
            <div className="info-grid">
              <div className="info-item"><span className="info-label">Full Name</span>{profile.name}</div>
              <div className="info-item"><span className="info-label">Email</span>{profile.email}</div>
              <div className="info-item"><span className="info-label">Phone</span>{profile.phone || <span className="muted">—</span>}</div>
              <div className="info-item">
                <span className="info-label">Account Status</span>
                <span className={`badge ${profile.status === 'active' ? 'badge-green' : 'badge-red'}`}>{profile.status}</span>
              </div>
              <div className="info-item"><span className="info-label">Member Since</span>{new Date(profile.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
          <div className="dash-card">
            <h3><MapPin size={15} style={{ marginRight: 8 }} />Health &amp; Address</h3>
            <div className="info-grid">
              <div className="info-item"><span className="info-label">Address</span>{memberDoc?.address || <span className="muted">—</span>}</div>
              <div className="info-item"><span className="info-label">Date of Birth</span>{memberDoc?.dateOfBirth ? new Date(memberDoc.dateOfBirth).toLocaleDateString('en-IN') : <span className="muted">—</span>}</div>
              <div className="info-item"><span className="info-label">Blood Group</span>{memberDoc?.bloodGroup || <span className="muted">—</span>}</div>
              <div className="info-item"><span className="info-label">Gender</span>{memberDoc?.gender || <span className="muted">—</span>}</div>
            </div>
          </div>
          <div className="dash-card">
            <h3><Heart size={15} style={{ marginRight: 8 }} />Emergency Contact</h3>
            <div className="info-grid">
              <div className="info-item"><span className="info-label">Name</span>{memberDoc?.emergencyContact?.name || <span className="muted">—</span>}</div>
              <div className="info-item"><span className="info-label">Phone</span>{memberDoc?.emergencyContact?.phone || <span className="muted">—</span>}</div>
              <div className="info-item"><span className="info-label">Relation</span>{memberDoc?.emergencyContact?.relation || <span className="muted">—</span>}</div>
            </div>
          </div>
          {profile.assignedTrainer && (
            <div className="dash-card">
              <h3><User size={15} style={{ marginRight: 8 }} />Assigned Trainer</h3>
              <div className="info-grid">
                <div className="info-item"><span className="info-label">Name</span><strong>{profile.assignedTrainer.name}</strong></div>
                <div className="info-item"><span className="info-label">Email</span>{profile.assignedTrainer.email}</div>
                {profile.assignedTrainer.phone && <div className="info-item"><span className="info-label">Phone</span>{profile.assignedTrainer.phone}</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Tab */}
      {tab === 'edit' && (
        <form onSubmit={handleSaveProfile} className="dash-card" style={{ maxWidth: 600 }}>
          <h3><Edit3 size={15} style={{ marginRight: 8 }} />Edit Personal Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <span className="form-label"><Phone size={12} /> Phone</span>
              <input className="input-field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </label>
            <label>
              <span className="form-label"><MapPin size={12} /> Address</span>
              <textarea className="textarea-input" rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Your address…" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span className="form-label">Blood Group</span>
                <select className="select-input full-width" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
                  <option value="">— Select —</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label>
                <span className="form-label">Date of Birth</span>
                <input className="input-field" type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </label>
            </div>
            <p style={{ margin: '8px 0 4px', fontWeight: 700, fontSize: 13, color: '#9b9f9a', textTransform: 'uppercase', letterSpacing: 1 }}>Emergency Contact</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span className="form-label">Name</span>
                <input className="input-field" value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Contact name" />
              </label>
              <label>
                <span className="form-label">Relation</span>
                <input className="input-field" value={ecRelation} onChange={e => setEcRelation(e.target.value)} placeholder="e.g. Father" />
              </label>
            </div>
            <label>
              <span className="form-label">Emergency Phone</span>
              <input className="input-field" type="tel" value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="+91 98765 43210" />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-green" disabled={saving}>{saving ? 'Saving…' : '✓ Save Changes'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setTab('profile')}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* Password Tab */}
      {tab === 'password' && (
        <form onSubmit={handleChangePassword} className="dash-card" style={{ maxWidth: 440 }}>
          <h3><Lock size={15} style={{ marginRight: 8 }} />Change Password</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <span className="form-label">Current Password</span>
              <input className="input-field" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required minLength={8} />
            </label>
            <label>
              <span className="form-label">New Password</span>
              <input className="input-field" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
            </label>
            <label>
              <span className="form-label">Confirm New Password</span>
              <input className="input-field" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
            </label>
            <button type="submit" className="btn btn-green" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              <Lock size={14} /> {saving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="dash-card" style={{ maxWidth: 440 }}>
          <h3><Bell size={15} style={{ marginRight: 8 }} />Notification Preferences</h3>
          <p className="muted" style={{ marginBottom: 20 }}>Choose how you'd like to receive membership reminders and gym updates.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Email Notifications', sub: 'Membership expiry, payment receipts, announcements', value: emailNotif, set: setEmailNotif },
              { label: 'SMS Notifications', sub: 'Reminders and important alerts via SMS', value: sms, set: setSms },
              { label: 'WhatsApp Notifications', sub: 'Receive updates on WhatsApp', value: whatsapp, set: setWhatsapp },
            ].map(({ label, sub, value, set }) => (
              <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{label}</p>
                  <p className="muted" style={{ margin: '2px 0 0', fontSize: 12 }}>{sub}</p>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="checkbox" checked={value} onChange={e => set(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--green)' }} />
                </div>
              </label>
            ))}
            <button type="submit" className="btn btn-green" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              <Bell size={14} /> {saving ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
