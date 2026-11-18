import React, { useEffect, useState } from 'react';
import { api, downloadFile } from '../api';
import {
  Settings,
  Save,
  Database,
  Download,
  Upload,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Send,
} from 'lucide-react';

type GymSettings = {
  gymName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  whatsapp: string;
  businessHours: string;
  gstEnabled: boolean;
  gstin: string;
  defaultTaxRate: number;
  receiptPrefix: string;
  memberIdPrefix: string;
  instagramUrl: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
};

type NotificationTemplate = {
  _id: string;
  key: string;
  label: string;
  whatsappBody: string;
  emailSubject: string;
  emailBody: string;
  active: boolean;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'backup' | 'templates'>('profile');
  const [form, setForm] = useState<Partial<GymSettings>>({});
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Backup & Restore state
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoring, setRestoring] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<any>(null);

  // Template editing state
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);

  // SMTP Test Email state
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState('');

  useEffect(() => {
    Promise.all([
      api<{ settings: GymSettings }>('/settings'),
      api<{ items: NotificationTemplate[] }>('/notifications/templates'),
    ])
      .then(([s, t]) => {
        setForm(s.settings);
        setTemplates(t.items || []);
        if (s.settings?.email) setTestEmail(s.settings.email);
      })
      .finally(() => setLoading(false));
  }, []);

  function set(field: string, value: string | boolean | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api('/settings', { method: 'PATCH', body: JSON.stringify(form) });
      setSuccess('सेटिंग्स सफलतापूर्वक सहेजी गईं! (Settings saved successfully!)');
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmail) return;
    setTestingEmail(true);
    setTestEmailResult('');
    try {
      const res = await api<{ message: string }>('/notifications/test-email', {
        method: 'POST',
        body: JSON.stringify({
          to: testEmail,
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort || 465,
          smtpUser: form.smtpUser,
          smtpPass: form.smtpPass,
          smtpFrom: form.smtpFrom,
        }),
      });
      setTestEmailResult(`✅ ${res.message}`);
    } catch (err: any) {
      setTestEmailResult(`❌ ${err.message || 'परीक्षण असफल'}`);
    } finally {
      setTestingEmail(false);
    }
  }

  // Handle Backup Export
  async function handleExportBackup() {
    setExportingBackup(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      await downloadFile('/backup/export', `fitnessvilla_backup_${date}.json`);
    } catch (err: any) {
      alert(err.message || 'Backup export failed');
    } finally {
      setExportingBackup(false);
    }
  }

  // Handle Backup Restore
  async function handleRestoreBackup(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFile) {
      alert('Please select a JSON backup file to restore.');
      return;
    }

    const confirmMsg =
      restoreMode === 'replace'
        ? '⚠️ WARNING: "Replace All" mode will permanently delete existing data before restoring. Are you absolutely certain?'
        : 'Restore will merge backup records with current database. Continue?';

    if (!window.confirm(confirmMsg)) return;

    setRestoring(true);
    setRestoreSummary(null);

    const formData = new FormData();
    formData.append('backup', restoreFile);

    try {
      const res = await api<any>(`/backup/restore?mode=${restoreMode}`, {
        method: 'POST',
        body: formData,
      });
      setRestoreSummary(res.summary);
      alert('Database restored successfully!');
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }

  // Handle Template Save
  async function handleSaveTemplate(tmpl: NotificationTemplate) {
    setSavingTemplateId(tmpl._id);
    try {
      await api(`/notifications/templates/${tmpl._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          whatsappBody: tmpl.whatsappBody,
          emailSubject: tmpl.emailSubject,
          emailBody: tmpl.emailBody,
        }),
      });
      alert(`टेम्पलेट "${tmpl.label}" सफलतापूर्वक सहेज दिया गया!`);
    } catch (err: any) {
      alert(err.message || 'टेम्पलेट सहेजने में विफल');
    } finally {
      setSavingTemplateId(null);
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings & System Administration</h1>
          <p className="muted">Gym profile, database backup & restore, and automated WhatsApp/email messaging</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Settings size={16} /> Gym Profile & Email Setup
        </button>
        <button
          className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          <Database size={16} /> Database Backup & Restore
        </button>
        <button
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <MessageSquare size={16} /> WhatsApp & Email Templates ({templates.length})
        </button>
      </div>

      {/* Tab 1: Gym Profile & SMTP Email Configuration */}
      {activeTab === 'profile' && (
        <form onSubmit={saveProfile}>
          <div className="settings-section">
            <h3><Settings size={17} /> Gym Profile Information</h3>
            <div className="form-grid">
              <label className="full-width">
                Gym Name
                <input value={form.gymName || ''} onChange={(e) => set('gymName', e.target.value)} maxLength={100} />
              </label>
              <label className="full-width">
                Tagline / Subtitle
                <input value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} maxLength={200} />
              </label>
              <label className="full-width">
                Address
                <textarea
                  rows={2}
                  value={form.address || ''}
                  onChange={(e) => set('address', e.target.value)}
                  maxLength={400}
                />
              </label>
              <label>
                Phone Number
                <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} maxLength={25} />
              </label>
              <label>
                WhatsApp Number
                <input value={form.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} maxLength={25} />
              </label>
              <label>
                Public Contact Email
                <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} maxLength={254} />
              </label>
              <label>
                Website
                <input value={form.website || ''} onChange={(e) => set('website', e.target.value)} maxLength={200} />
              </label>
              <label className="full-width">
                Business Hours
                <input
                  value={form.businessHours || ''}
                  onChange={(e) => set('businessHours', e.target.value)}
                  maxLength={300}
                />
              </label>
              <label className="full-width">
                Instagram Profile URL
                <input
                  value={form.instagramUrl || ''}
                  onChange={(e) => set('instagramUrl', e.target.value)}
                  maxLength={200}
                />
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Tax & Invoicing Prefixes</h3>
            <div className="form-grid">
              <label>
                GST Invoicing Enabled
                <div className="toggle-wrap">
                  <input
                    type="checkbox"
                    checked={!!form.gstEnabled}
                    onChange={(e) => set('gstEnabled', e.target.checked)}
                  />
                  <span>{form.gstEnabled ? 'Yes' : 'No'}</span>
                </div>
              </label>
              {form.gstEnabled && (
                <>
                  <label>
                    GSTIN
                    <input
                      value={form.gstin || ''}
                      onChange={(e) => set('gstin', e.target.value)}
                      maxLength={20}
                      placeholder="e.g. 27AAAAA0000A1Z5"
                    />
                  </label>
                  <label>
                    Default Tax / GST Rate (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={form.defaultTaxRate ?? 0}
                      onChange={(e) => set('defaultTaxRate', Number(e.target.value))}
                    />
                  </label>
                </>
              )}
              <label>
                Receipt Number Prefix
                <input
                  value={form.receiptPrefix || 'IP'}
                  onChange={(e) => set('receiptPrefix', e.target.value)}
                  maxLength={10}
                />
              </label>
              <label>
                Member ID Prefix
                <input
                  value={form.memberIdPrefix || 'MBR'}
                  onChange={(e) => set('memberIdPrefix', e.target.value)}
                  maxLength={10}
                />
              </label>
            </div>
          </div>

          {/* Email Delivery & SMTP Configuration */}
          <div className="settings-section">
            <h3><Mail size={17} /> Email Delivery &amp; SMTP Configuration (ईमेल सेटिंग्स)</h3>
            <p className="muted" style={{ marginBottom: 18 }}>
              सदस्यों को सीधे उनके इनबॉक्स में 100% लाइव हिंदी ईमेल भेजने के लिए अपनी Gmail App Password या SMTP जानकारी दर्ज करें।
            </p>
            <div className="form-grid">
              <label>
                SMTP Host
                <input
                  value={form.smtpHost || ''}
                  onChange={(e) => set('smtpHost', e.target.value)}
                  placeholder="जैसे: smtp.gmail.com"
                />
              </label>
              <label>
                SMTP Port
                <input
                  type="number"
                  value={form.smtpPort || 587}
                  onChange={(e) => set('smtpPort', Number(e.target.value))}
                  placeholder="587 या 465"
                />
              </label>
              <label>
                SMTP Email / Username
                <input
                  type="email"
                  value={form.smtpUser || ''}
                  onChange={(e) => set('smtpUser', e.target.value)}
                  placeholder="जैसे: fitnessvilla@gmail.com"
                />
              </label>
              <label>
                SMTP Password / App Password
                <input
                  type="password"
                  value={form.smtpPass || ''}
                  onChange={(e) => set('smtpPass', e.target.value)}
                  placeholder="16-अक्षरों का Google App Password"
                />
              </label>
              <label className="full-width">
                From Name / Address
                <input
                  value={form.smtpFrom || ''}
                  onChange={(e) => set('smtpFrom', e.target.value)}
                  placeholder='"Fitness Villa" <fitnessvilla@gmail.com>'
                />
                <small className="muted" style={{ marginTop: 6, display: 'block' }}>
                  💡 <strong>Gmail का उपयोग कर रहे हैं?</strong> अपने Google Account में जाएं → <strong>Security</strong> → <strong>2-Step Verification</strong> ऑन करें → <strong>App passwords</strong> बनाकर 16-अक्षरों का कोड यहाँ पेस्ट करें।
                </small>
              </label>
            </div>

            {/* Test Email Box */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="टेस्ट ईमेल पता (जैसे: test@gmail.com)"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                style={{ flex: '1 1 240px', padding: '10px 14px' }}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testEmail}
              >
                <Send size={14} />
                {testingEmail ? 'टेस्ट ईमेल भेजा जा रहा है…' : 'परीक्षण ईमेल भेजें (Send Test Email)'}
              </button>
              {testEmailResult && (
                <div style={{ width: '100%', fontSize: 13, marginTop: 6, color: testEmailResult.startsWith('✅') ? 'var(--green)' : '#ff6b6b' }}>
                  {testEmailResult}
                </div>
              )}
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-green" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Backup & Restore */}
      {activeTab === 'backup' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Export Section */}
          <div className="settings-section">
            <h3><Download size={17} /> 1. Export Full Database Backup</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              Download a complete JSON snapshot of all members, plans, attendance records, financial transactions,
              inventory, sales, and settings.
            </p>
            <button className="btn btn-green" onClick={handleExportBackup} disabled={exportingBackup}>
              <Download size={16} />
              {exportingBackup ? 'Exporting JSON…' : 'Download Full Backup (.json)'}
            </button>
          </div>

          {/* Restore Section */}
          <div className="settings-section">
            <h3><Upload size={17} /> 2. Restore Database from Backup</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              Upload a previously exported JSON backup file to restore records. Choose whether to merge with existing data
              or replace everything.
            </p>
            <form onSubmit={handleRestoreBackup} style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
              <label>
                Select Backup JSON File
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  required
                  style={{ marginTop: '6px' }}
                />
              </label>

              <label>
                Restore Mode
                <select
                  value={restoreMode}
                  onChange={(e) => setRestoreMode(e.target.value as any)}
                  style={{ marginTop: '6px' }}
                >
                  <option value="merge">Merge (Preserve existing, add missing)</option>
                  <option value="replace">Replace All (⚠️ Erase current DB, restore from backup)</option>
                </select>
              </label>

              <button
                type="submit"
                className={`btn ${restoreMode === 'replace' ? 'btn-red' : 'btn-outline'}`}
                disabled={restoring || !restoreFile}
                style={{ width: 'fit-content' }}
              >
                <RefreshCw size={16} className={restoring ? 'spin' : ''} />
                {restoring ? 'Restoring Database…' : 'Execute Restore'}
              </button>

              {restoreSummary && (
                <div style={{ background: '#131b14', border: '1px solid #233125', borderRadius: '8px', padding: '16px', marginTop: '12px' }}>
                  <h4 style={{ color: 'var(--green)', margin: '0 0 8px 0' }}>Restore Completed Successfully:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#c5ccc2' }}>
                    {Object.entries(restoreSummary).map(([col, cnt]) => (
                      <li key={col}><strong>{col}:</strong> {cnt as number} records restored</li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: WhatsApp & Email Templates */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <p className="muted">
            सदस्यता समाप्ति और भुगतान रसीद के लिए WhatsApp और ईमेल टेम्पलेट यहाँ से संपादित करें। आप निम्नलिखित डायनामिक वेरिएबल्स का उपयोग कर सकते हैं: <code>&#123;memberName&#125;</code>, <code>&#123;planName&#125;</code>,{' '}
            <code>&#123;daysLeft&#125;</code>, <code>&#123;expiryDate&#125;</code>, <code>&#123;gymName&#125;</code>,{' '}
            <code>&#123;gymPhone&#125;</code>, <code>&#123;amount&#125;</code>.
          </p>

          {templates.map((tmpl, idx) => (
            <div key={tmpl._id} className="settings-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{tmpl.label}</h3>
                  <small className="muted">कुंजी (Key): <code>{tmpl.key}</code></small>
                </div>
                <button
                  type="button"
                  className="btn btn-green btn-sm"
                  onClick={() => handleSaveTemplate(tmpl)}
                  disabled={savingTemplateId === tmpl._id}
                >
                  <Save size={14} /> {savingTemplateId === tmpl._id ? 'सहेज रहे हैं…' : 'टेम्पलेट सहेजें'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                <label>
                  💬 WhatsApp Message Template (हिंदी)
                  <textarea
                    rows={4}
                    value={tmpl.whatsappBody || ''}
                    onChange={(e) => {
                      const next = [...templates];
                      next[idx].whatsappBody = e.target.value;
                      setTemplates(next);
                    }}
                    style={{ marginTop: '6px', width: '100%', fontFamily: 'inherit', padding: '10px', background: '#111412', border: '1px solid var(--line)', color: '#fff', borderRadius: '6px' }}
                  />
                </label>

                <label>
                  ✉️ Email Subject (हिंदी)
                  <input
                    value={tmpl.emailSubject || ''}
                    onChange={(e) => {
                      const next = [...templates];
                      next[idx].emailSubject = e.target.value;
                      setTemplates(next);
                    }}
                    style={{ marginTop: '6px' }}
                  />
                </label>

                <label>
                  ✉️ Email Body (HTML / Text - हिंदी)
                  <textarea
                    rows={4}
                    value={tmpl.emailBody || ''}
                    onChange={(e) => {
                      const next = [...templates];
                      next[idx].emailBody = e.target.value;
                      setTemplates(next);
                    }}
                    style={{ marginTop: '6px', width: '100%', fontFamily: 'inherit', padding: '10px', background: '#111412', border: '1px solid var(--line)', color: '#fff', borderRadius: '6px' }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
