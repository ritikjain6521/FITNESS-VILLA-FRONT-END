import { useEffect, useState } from 'react';
import { api, fmt } from '../../api';
import {
  CalendarCheck, AlertTriangle, BarChart2, Clock, TrendingUp,
  Camera, CheckCircle, LogOut, ShieldCheck, MapPin, Eye, X
} from 'lucide-react';
import LivePhotoAttendanceModal from '../../components/LivePhotoAttendanceModal';

type AttendanceRecord = {
  _id: string;
  checkInAt: string;
  checkOutAt?: string;
  photoUrl?: string;
  verificationMethod?: string;
  status?: string;
  location?: string;
};

type Stats = {
  totalVisits: number;
  totalMinutes: number;
  avgMinutes: number;
};

type AttendanceStatusMe = {
  isCheckedIn: boolean;
  activeSession?: AttendanceRecord | null;
  canCheckIn: boolean;
  accountStatus: string;
  membership?: { active: boolean; planName: string; endDate: string } | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

export default function MemberAttendancePage() {
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ totalVisits: 0, totalMinutes: 0, avgMinutes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Self attendance state
  const [statusMe, setStatusMe] = useState<AttendanceStatusMe | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Image lightbox preview
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Live timer for active session
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  function loadStatus() {
    api<AttendanceStatusMe>('/attendance/status/me')
      .then(res => {
        setStatusMe(res);
        if (res.activeSession?.checkInAt) {
          const diffMs = Date.now() - new Date(res.activeSession.checkInAt).getTime();
          setElapsedMinutes(Math.max(1, Math.round(diffMs / 60000)));
        }
      })
      .catch(() => {});
  }

  function loadHistory() {
    setLoading(true);
    setError('');
    api<{ items: AttendanceRecord[]; stats: Stats }>(`/attendance?month=${selectedMonth}`)
      .then(r => {
        setItems(r.items);
        setStats(r.stats);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStatus();
    loadHistory();
  }, [selectedMonth]);

  // Elapsed timer tick
  useEffect(() => {
    if (!statusMe?.isCheckedIn || !statusMe.activeSession?.checkInAt) return;
    const interval = setInterval(() => {
      const diffMs = Date.now() - new Date(statusMe.activeSession!.checkInAt).getTime();
      setElapsedMinutes(Math.max(1, Math.round(diffMs / 60000)));
    }, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [statusMe]);

  // Handle successful check-in
  function handleCheckInSuccess(record: any) {
    setActionSuccess('Check-in recorded successfully! Live photo verified.');
    setActionError('');
    loadStatus();
    loadHistory();
    setTimeout(() => setActionSuccess(''), 6000);
  }

  // Handle self check-out
  async function handleCheckOut() {
    setCheckingOut(true);
    setActionError('');
    try {
      const res = await api<{ message: string; durationMinutes: number }>('/attendance/self-checkout', {
        method: 'POST',
      });
      setActionSuccess(res.message || 'Check-out successful!');
      loadStatus();
      loadHistory();
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err: any) {
      setActionError(err.message || 'Check-out failed.');
    } finally {
      setCheckingOut(false);
    }
  }

  // Calendar calculations
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const attendedDays = new Set(items.map(a => new Date(a.checkInAt).getDate()));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Attendance & Access</h1>
          <p className="muted">Daily live selfie check-in and workout consistency log</p>
        </div>
        <div className="page-actions">
          {!statusMe?.isCheckedIn && statusMe?.canCheckIn && (
            <button
              className="btn btn-green"
              onClick={() => setCameraModalOpen(true)}
              style={{ boxShadow: '0 0 20px rgba(181, 242, 61, 0.35)' }}
            >
              <Camera size={16} /> Self Check-In (Live Photo)
            </button>
          )}
          <select
            className="select-input"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="status-banner status-green" style={{ marginBottom: 20 }}>
          <CheckCircle size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="status-banner status-yellow" style={{ marginBottom: 20 }}>
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* ─── LIVE ACTIVE SESSION OR CHECK-IN HERO ─── */}
      {statusMe?.isCheckedIn && statusMe.activeSession ? (
        <div className="active-session-banner">
          <div className="session-info-left">
            {statusMe.activeSession.photoUrl ? (
              <div
                className="session-avatar-wrap"
                style={{ cursor: 'pointer' }}
                onClick={() => setPreviewPhoto(statusMe.activeSession!.photoUrl!)}
                title="Click to view full photo"
              >
                <img src={statusMe.activeSession.photoUrl} alt="Check-in selfie" />
                <span className="session-live-pill">LIVE</span>
              </div>
            ) : (
              <div className="session-avatar-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={26} className="accent" />
                <span className="session-live-pill">IN GYM</span>
              </div>
            )}
            <div>
              <h4 className="session-meta-h4">
                {statusMe.activeSession.status === 'pending'
                  ? 'Check-In Submitted (Pending Approval)'
                  : 'You are currently training in the gym!'}
                {statusMe.activeSession.status === 'pending' ? (
                  <span className="badge badge-yellow" style={{ fontSize: 11, padding: '3px 8px' }}>
                    <Clock size={12} /> Awaiting Approval
                  </span>
                ) : (
                  <span className="badge badge-green" style={{ fontSize: 11, padding: '3px 8px' }}>
                    <ShieldCheck size={12} /> Approved &amp; Verified
                  </span>
                )}
              </h4>
              <p className="session-meta-sub">
                <span>
                  <Clock size={13} className="accent" />
                  Checked in at {new Date(statusMe.activeSession.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>
                  <MapPin size={13} />
                  {statusMe.activeSession.location || 'Fitness Villa Main Floor'}
                </span>
                <span className="session-timer-badge">
                  ⏱ Elapsed: {elapsedMinutes >= 60 ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m` : `${elapsedMinutes} min`}
                </span>
              </p>
            </div>
          </div>
          <div>
            <button
              className="btn btn-outline"
              onClick={handleCheckOut}
              disabled={checkingOut}
              style={{ borderColor: 'rgba(255, 87, 87, 0.4)', color: '#ff6b6b' }}
            >
              <LogOut size={15} /> {checkingOut ? 'Checking Out…' : 'Check Out Now'}
            </button>
          </div>
        </div>
      ) : (
        /* Not checked in: prompt card */
        <div
          className="dash-card"
          style={{
            marginBottom: 24,
            background: 'linear-gradient(135deg, rgba(15, 23, 17, 0.9), rgba(10, 14, 11, 0.9))',
            border: '1px solid rgba(181, 242, 61, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'rgba(181, 242, 61, 0.12)',
                border: '1px solid rgba(181, 242, 61, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--green)',
              }}
            >
              <Camera size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16 }}>Live Selfie Self Check-In</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Arrived at the gym? Snap a quick live selfie with your camera to check in instantly without waiting at the front desk.
              </p>
            </div>
          </div>
          <div>
            {statusMe?.canCheckIn ? (
              <button
                className="btn btn-green"
                onClick={() => setCameraModalOpen(true)}
                style={{ padding: '10px 20px', fontSize: 14 }}
              >
                <Camera size={16} /> Start Live Photo Check-In
              </button>
            ) : (
              <span className="badge badge-yellow" style={{ padding: '8px 12px', fontSize: 12 }}>
                {!statusMe?.membership ? 'Membership Expired / Inactive' : 'Check-In Not Available'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
        <div className="kpi-card kpi-accent">
          <div className="kpi-icon"><CalendarCheck size={20} /></div>
          <div className="kpi-value">{stats.totalVisits}</div>
          <div className="kpi-label">Visits This Month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Clock size={20} /></div>
          <div className="kpi-value">{stats.totalMinutes > 0 ? `${Math.round(stats.totalMinutes / 60)}h` : '—'}</div>
          <div className="kpi-label">Total Hours</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><BarChart2 size={20} /></div>
          <div className="kpi-value">{stats.avgMinutes > 0 ? `${stats.avgMinutes}m` : '—'}</div>
          <div className="kpi-label">Avg Session</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><TrendingUp size={20} /></div>
          <div className="kpi-value">{daysInMonth > 0 ? `${Math.round((attendedDays.size / daysInMonth) * 100)}%` : '—'}</div>
          <div className="kpi-label">Consistency Rate</div>
        </div>
      </div>

      {/* Calendar heatmap */}
      <div className="dash-card" style={{ marginBottom: 24 }}>
        <h3>
          <CalendarCheck size={17} style={{ marginRight: 8 }} />
          Monthly Calendar — {MONTHS[month]} {year}
        </h3>
        <div className="attendance-calendar">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="cal-header">{d}</div>
          ))}
          {/* Empty slots for start of month */}
          {(() => {
            const firstDay = new Date(year, month, 1).getDay();
            const offset = firstDay === 0 ? 6 : firstDay - 1;
            return Array.from({ length: offset }, (_, i) => <div key={`empty-${i}`} className="cal-day cal-empty" />);
          })()}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
            <div
              key={day}
              className={`cal-day ${attendedDays.has(day) ? 'cal-attended' : ''} ${new Date(year, month, day) > new Date() ? 'cal-future' : ''}`}
            >
              <span>{day}</span>
              {attendedDays.has(day) && <span className="cal-dot" />}
            </div>
          ))}
        </div>
      </div>

      {/* Session Detail Table */}
      <div className="table-card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} className="accent" />
          <strong style={{ fontSize: 14 }}>Session History & Live Verification</strong>
          <span className="badge badge-green" style={{ marginLeft: 'auto' }}>{items.length} records</span>
        </div>
        {loading && <div className="page-loading" style={{ padding: 40 }}><div className="spinner" /></div>}
        {error && <div className="page-error" style={{ padding: 20 }}><AlertTriangle size={18} />{error}</div>}
        {!loading && !error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Verification Proof</th>
                  <th>Date</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="empty-td">No attendance records for this month.</td></tr>
                ) : (
                  items.map(a => {
                    const inTime = new Date(a.checkInAt);
                    const outTime = a.checkOutAt ? new Date(a.checkOutAt) : null;
                    const durationMin = outTime ? Math.round((outTime.getTime() - inTime.getTime()) / 60000) : null;
                    const isSelfPhoto = a.verificationMethod === 'self_photo' || Boolean(a.photoUrl);

                    return (
                      <tr key={a._id}>
                        <td>
                          {a.photoUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <img
                                src={a.photoUrl}
                                alt="Selfie proof"
                                className="attendance-photo-thumb"
                                onClick={() => setPreviewPhoto(a.photoUrl!)}
                                title="Click to view full verification photo"
                              />
                              <span className="badge badge-green" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <ShieldCheck size={11} /> Selfie Verified
                              </span>
                            </div>
                          ) : (
                            <span className="badge badge-outline" style={{ fontSize: 10 }}>
                              Front Desk / Manual
                            </span>
                          )}
                        </td>
                        <td>{fmt(a.checkInAt)}</td>
                        <td>{inTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{outTime ? outTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td>
                          {durationMin !== null
                            ? durationMin >= 60
                              ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
                              : `${durationMin} min`
                            : '—'}
                        </td>
                        <td>
                          {outTime
                            ? <span className="badge badge-green">Completed</span>
                            : <span className="badge badge-yellow">In Session</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Camera Check-In Modal */}
      <LivePhotoAttendanceModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onSuccess={handleCheckInSuccess}
      />

      {/* Photo Lightbox Preview Modal */}
      {previewPhoto && (
        <div className="modal-backdrop" onClick={() => setPreviewPhoto(null)}>
          <div className="modal-dialog" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3><ShieldCheck size={18} className="accent" /> Live Selfie Proof</h3>
              <button className="modal-close-btn" onClick={() => setPreviewPhoto(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <img
                src={previewPhoto}
                alt="Verification Proof"
                style={{ width: '100%', borderRadius: 12, border: '2px solid rgba(181, 242, 61, 0.4)', boxShadow: '0 8px 30px rgba(0,0,0,0.8)' }}
              />
              <p style={{ margin: '14px 0 0 0', fontSize: 12, color: '#9b9f9a' }}>
                Captured and verified through Fitness Villa Member Live Photo System.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
