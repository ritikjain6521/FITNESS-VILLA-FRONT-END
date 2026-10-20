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

  useEffect(() => {
    Promise.all([
      api<{ settings: GymSettings }>('/settings'),
      api<{ items: NotificationTemplate[] }>('/notifications/templates'),
    ])
      .then(([s, t]) => {
        setForm(s.settings);
        setTemplates(t.items || []);
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
      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
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
  async function handleRestoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFile) return;

    if (restoreMode === 'replace') {
      const confirmReplace = window.confirm(
        'WARNING: "Replace" mode will overwrite existing database records with the backup file data. Are you sure you want to proceed?'
      );
      if (!confirmReplace) return;
    }

    setRestoring(true);
    setRestoreSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', restoreFile);
      formData.append('mode', restoreMode);

      const res = await api<any>('/backup/restore', {
        method: 'POST',
        body: formData,
      });

      setRestoreSummary(res.summary);
      setRestoreFile(null);
      alert('Database backup restored successfully!');
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
      alert(`Template "${tmpl.label}" updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update template');
    } finally {
      setSavingTemplateId(null);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

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
          <Settings size={16} /> Gym Profile & GST
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

      {/* Tab 1: Profile & Billing */}
      {activeTab === 'profile' && (
        <form onSubmit={saveProfile}>
          <div className="settings-section">
            <h3><Settings size={17} /> Gym Profile Information</h3>
            <div className="form-grid">
              <label>
                Gym Name
                <input value={form.gymName || ''} onChange={(e) => set('gymName', e.target.value)} maxLength={100} />
              </label>
              <label>
                Tagline
                <input value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} maxLength={200} />
              </label>
              <label className="full-width">
                Address
                <input value={form.address || ''} onChange={(e) => set('address', e.target.value)} maxLength={400} />
              </label>
              <label>
                Phone
                <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} maxLength={25} />
              </label>
              <label>
                Email
                <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} maxLength={254} />
              </label>
              <label>
                WhatsApp Helpline Number
                <input
                  value={form.whatsapp || ''}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  maxLength={25}
                  placeholder="e.g. 919876543210"
                />
              </label>
              <label>
                Business Hours
                <input value={form.businessHours || ''} onChange={(e) => set('businessHours', e.target.value)} maxLength={300} />
              </label>
              <label>
                Website URL
                <input value={form.website || ''} onChange={(e) => set('website', e.target.value)} maxLength={200} />
              </label>
              <label>
                Instagram URL
                <input value={form.instagramUrl || ''} onChange={(e) => set('instagramUrl', e.target.value)} maxLength={200} />
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
            <p className="muted" style={{ marginBottom: '16px' }}>
              Download a complete JSON snapshot of all collections: Members, Plans, Memberships, Attendance, Payments,
              Expenses, Products, Store Sales, and System Settings. Store this backup safely for disaster recovery.
            </p>
            <button className="btn btn-green" onClick={handleExportBackup} disabled={exportingBackup}>
              <Download size={16} /> {exportingBackup ? 'Generating Backup…' : 'Download Complete JSON Backup File'}
            </button>
          </div>

          {/* Restore Section */}
          <div className="settings-section">
            <h3><Upload size={17} /> 2. Restore Database from Backup</h3>
            <p className="muted" style={{ marginBottom: '16px' }}>
              Upload a previously exported Fitness Villa JSON backup file to restore records.
            </p>

            <form onSubmit={handleRestoreSubmit} style={{ display: 'grid', gap: '16px', maxWidth: '600px' }}>
              <label>
                Select Backup File (.json) *
                <input
                  type="file"
                  required
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
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
                  <option value="merge">Merge & Upsert (Safely updates or adds missing items without wiping existing data)</option>
                  <option value="replace">Clean & Replace (Clears collections and restores exact snapshot)</option>
                </select>
              </label>

              {restoreMode === 'replace' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} />
                  <span>Caution: "Clean & Replace" mode will delete existing database records before restoring!</span>
                </div>
              )}

              {restoreSummary && (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#86efac', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <CheckCircle2 size={16} /> Restore Succeeded:
                  </div>
                  <pre style={{ margin: 0, fontSize: '12px', color: '#fff' }}>
                    {JSON.stringify(restoreSummary, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <button type="submit" className="btn btn-green" disabled={restoring || !restoreFile}>
                  <RefreshCw size={16} /> {restoring ? 'Restoring Database…' : 'Start Restore Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: WhatsApp & Email Templates */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <p className="muted">
            Configure automated message content sent via WhatsApp and Email for expiring gym memberships and payment
            receipts. You can use dynamic variables like <code>&#123;memberName&#125;</code>, <code>&#123;planName&#125;</code>,{' '}
            <code>&#123;daysLeft&#125;</code>, <code>&#123;expiryDate&#125;</code>, <code>&#123;gymName&#125;</code>,{' '}
            <code>&#123;gymPhone&#125;</code>.
          </p>

          {templates.map((tmpl, idx) => (
            <div key={tmpl._id} className="settings-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{tmpl.label}</h3>
                  <small className="muted">Identifier: <code>{tmpl.key}</code></small>
                </div>
                <button
                  type="button"
                  className="btn btn-green btn-sm"
                  onClick={() => handleSaveTemplate(tmpl)}
                  disabled={savingTemplateId === tmpl._id}
                >
                  <Save size={14} /> {savingTemplateId === tmpl._id ? 'Saving…' : 'Save Template'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                <label>
                  💬 WhatsApp Message Template
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
                  ✉️ Email Subject
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
                  ✉️ Email Body (HTML / Text)
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
