import React, { useEffect, useState } from 'react';
import { api, fmt } from '../../api';
import {
  Bell, Plus, Edit2, Trash2, CheckCircle, AlertTriangle,
  X, Tag, Sparkles, Calendar, Flame, AlertCircle, Megaphone
} from 'lucide-react';

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type: 'announcement' | 'offer' | 'event' | 'alert';
  priority: 'normal' | 'high' | 'urgent';
  badge?: string;
  discountPercent?: number;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: { name: string };
};

const typeLabels: Record<string, string> = {
  announcement: 'Announcement',
  offer: 'Special Offer',
  event: 'Gym Event',
  alert: 'Important Alert',
};

const badgeClasses: Record<string, string> = {
  announcement: 'badge-green',
  offer: 'badge-yellow',
  event: 'badge-orange',
  alert: 'badge-red',
};

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'announcement' | 'offer' | 'event' | 'alert'>('announcement');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [badge, setBadge] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function loadAnnouncements() {
    setLoading(true);
    setError('');
    api<{ items: Announcement[] }>('/announcements')
      .then(res => setItems(res.items || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  function openCreateModal() {
    setEditingItem(null);
    setTitle('');
    setContent('');
    setType('announcement');
    setPriority('normal');
    setBadge('');
    setDiscountPercent('');
    setValidUntil('');
    setIsActive(true);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(item: Announcement) {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setType(item.type);
    setPriority(item.priority);
    setBadge(item.badge || '');
    setDiscountPercent(item.discountPercent !== undefined ? String(item.discountPercent) : '');
    setValidUntil(item.validUntil ? new Date(item.validUntil).toISOString().split('T')[0] : '');
    setIsActive(item.isActive !== false);
    setError('');
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    const payload: any = {
      title: title.trim(),
      content: content.trim(),
      type,
      priority,
      isActive,
    };

    if (badge.trim()) payload.badge = badge.trim();
    if (discountPercent) {
      const disc = parseFloat(discountPercent);
      if (!isNaN(disc)) payload.discountPercent = disc;
    }
    if (validUntil) payload.validUntil = new Date(validUntil);

    setSubmitting(true);
    setError('');

    try {
      if (editingItem) {
        await api(`/announcements/${editingItem._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setSuccess('Announcement updated successfully!');
      } else {
        await api('/announcements', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess('New announcement published to member portal!');
      }

      setModalOpen(false);
      loadAnnouncements();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: Announcement) {
    const confirm = window.confirm(`Delete announcement "${item.title}"?`);
    if (!confirm) return;

    try {
      await api(`/announcements/${item._id}`, { method: 'DELETE' });
      setSuccess('Announcement deleted.');
      loadAnnouncements();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete announcement');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Announcements &amp; Offers</h1>
          <p className="muted">Broadcast special gym offers, festival discounts, and facility updates to members</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-green" onClick={openCreateModal}>
            <Plus size={16} /> New Announcement / Offer
          </button>
        </div>
      </div>

      {success && (
        <div className="status-banner status-green" style={{ marginBottom: 20 }}>
          <CheckCircle size={18} />
          <span>{success}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setSuccess('')}>×</button>
        </div>
      )}
      {error && !modalOpen && (
        <div className="status-banner status-red" style={{ marginBottom: 20 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setError('')}>×</button>
        </div>
      )}

      {loading && (
        <div className="page-loading" style={{ padding: 60 }}>
          <div className="spinner" />
          <span>Loading announcements…</span>
        </div>
      )}

      {!loading && (
        <div className="member-announcements-grid">
          {items.length === 0 ? (
            <div className="dash-card full-width" style={{ textAlign: 'center', padding: 40 }}>
              <Megaphone size={36} className="accent" style={{ margin: '0 auto 12px auto', display: 'block' }} />
              <h3>No Announcements Yet</h3>
              <p className="muted">Create your first gym announcement or special offer to broadcast to all members.</p>
              <button className="btn btn-green btn-sm" onClick={openCreateModal} style={{ marginTop: 12 }}>
                <Plus size={14} /> Create One Now
              </button>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item._id}
                className="dash-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: item.isActive ? '1px solid rgba(181, 242, 61, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  opacity: item.isActive ? 1 : 0.6,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className={`badge ${badgeClasses[item.type] || 'badge-green'}`}>
                      {item.badge || typeLabels[item.type] || 'Announcement'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.priority === 'urgent' && <span className="badge badge-red">Urgent</span>}
                      <span className={`badge ${item.isActive ? 'badge-green' : 'badge-outline'}`}>
                        {item.isActive ? 'Active' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <h3 style={{ margin: '0 0 8px 0', fontSize: 17 }}>{item.title}</h3>
                  <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                    {item.content}
                  </p>

                  {item.discountPercent !== undefined && item.discountPercent > 0 && (
                    <div className="status-banner status-yellow" style={{ padding: '8px 12px', marginBottom: 12 }}>
                      <Flame size={16} />
                      <span style={{ fontSize: 12 }}>Special Promo: <strong>{item.discountPercent}% Instant Discount</strong></span>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: '#8e968c', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Published: {fmt(item.createdAt)}</span>
                    {item.validUntil && <span>Expires: {fmt(item.validUntil)}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEditModal(item)}>
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: 'rgba(255, 87, 87, 0.4)', color: '#ff6b6b' }}
                    onClick={() => handleDelete(item)}
                    title="Delete Announcement"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) setModalOpen(false); }}>
          <div className="modal-dialog" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3>
                <Megaphone size={18} className="accent" />
                {editingItem ? 'Edit Announcement / Offer' : 'Create New Announcement / Offer'}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)} disabled={submitting}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-body">
              {error && (
                <div className="error-msg" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={15} /> {error}
                </div>
              )}

              <div className="form-grid">
                <label className="full-width">
                  Announcement Title *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali Flash Sale — 20% Off All Passes!"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </label>

                <label>
                  Type *
                  <select value={type} onChange={e => setType(e.target.value as any)}>
                    <option value="announcement">General Announcement</option>
                    <option value="offer">Special Offer / Promotion</option>
                    <option value="event">Gym Workshop / Event</option>
                    <option value="alert">Alert / Holiday Notice</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select value={priority} onChange={e => setPriority(e.target.value as any)}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>

                <label>
                  Badge Tag (Optional)
                  <input
                    type="text"
                    placeholder="e.g. 50% OFF, LIMITED TIME"
                    value={badge}
                    onChange={e => setBadge(e.target.value)}
                  />
                </label>

                <label>
                  Discount % (If Offer)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 20"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(e.target.value)}
                  />
                </label>

                <label className="full-width">
                  Valid Until Date (Optional)
                  <input
                    type="date"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                  />
                </label>

                <label className="full-width">
                  Detailed Content *
                  <textarea
                    rows={4}
                    required
                    placeholder="Write the full announcement details, terms, or instructions for members..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                </label>

                <label className="full-width" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                  />
                  <span>Active &amp; Broadcast to Member Portals immediately</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-green"
                  disabled={submitting || !title.trim() || !content.trim()}
                >
                  {submitting ? 'Saving…' : editingItem ? 'Save Changes' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
