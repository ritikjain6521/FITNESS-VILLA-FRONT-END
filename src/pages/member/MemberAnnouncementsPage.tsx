import { useEffect, useState } from 'react';
import { api, fmt } from '../../api';
import { Bell, Tag, CalendarCheck, AlertTriangle, Megaphone } from 'lucide-react';

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type: 'announcement' | 'offer' | 'event' | 'alert';
  priority: 'normal' | 'high' | 'urgent';
  badge?: string;
  discountPercent?: number;
  validUntil?: string;
  createdAt: string;
};

const typeColors: Record<string, string> = {
  offer: 'badge-yellow',
  announcement: 'badge-green',
  event: 'badge-orange',
  alert: 'badge-red',
};

const typeEmoji: Record<string, string> = {
  offer: '🏷️',
  announcement: '📢',
  event: '🎉',
  alert: '⚠️',
};

export default function MemberAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    api<{ items: Announcement[] }>('/announcements')
      .then(r => setAnnouncements(r.items))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? announcements : announcements.filter(a => a.type === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Announcements &amp; Offers</h1>
          <p className="muted">Stay updated with gym news, offers, and events</p>
        </div>
        <div className="page-actions">
          <select className="select-input" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="announcement">📢 Announcements</option>
            <option value="offer">🏷️ Offers</option>
            <option value="event">🎉 Events</option>
            <option value="alert">⚠️ Alerts</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="status-banner status-red" style={{ marginBottom: 20 }}>
          <AlertTriangle size={18} /><span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Megaphone size={48} style={{ color: '#2d332c', marginBottom: 16 }} />
          <p style={{ color: '#7f857d', fontSize: 15 }}>No {filter !== 'all' ? filter + 's' : 'announcements'} right now. Check back later!</p>
        </div>
      ) : (
        <div className="member-announcements-grid">
          {filtered.map(ann => {
            const isHighPriority = ann.priority === 'high' || ann.priority === 'urgent';
            const isExpiringSoon = ann.validUntil && new Date(ann.validUntil).getTime() - Date.now() < 3 * 24 * 3600 * 1000;

            return (
              <div key={ann._id} className={`announcement-card ann-${ann.type} ${isHighPriority ? 'ann-priority' : ''}`}>
                <div className="ann-top">
                  <span style={{ fontSize: 20 }}>{typeEmoji[ann.type]}</span>
                  {ann.badge && <span className={`badge ${typeColors[ann.type]}`}>{ann.badge}</span>}
                  <span className={`badge ${typeColors[ann.type]}`} style={{ marginLeft: ann.badge ? 0 : 'auto' }}>{ann.type}</span>
                  {isHighPriority && <span className="badge badge-red" style={{ marginLeft: 4 }}>PRIORITY</span>}
                </div>
                <h4 style={{ margin: '12px 0 8px', fontSize: 17, fontWeight: 700 }}>{ann.title}</h4>
                <p style={{ margin: 0, color: '#cdd0cc', fontSize: 14, lineHeight: 1.6 }}>{ann.content}</p>

                {ann.discountPercent ? (
                  <div className="ann-discount" style={{ marginTop: 12 }}>
                    <Tag size={14} /> <strong>{ann.discountPercent}% discount available</strong>
                  </div>
                ) : null}

                <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 11 }}>
                    <Bell size={11} style={{ marginRight: 4 }} />
                    Posted {fmt(ann.createdAt)}
                  </span>
                  {ann.validUntil && (
                    <span className={`muted`} style={{ fontSize: 11, color: isExpiringSoon ? '#ff9f43' : undefined }}>
                      <CalendarCheck size={11} style={{ marginRight: 4 }} />
                      Valid until {fmt(ann.validUntil)}
                      {isExpiringSoon && ' ⚡ Expiring soon!'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
