import { useEffect, useState } from 'react';
import { api, fmt } from '../api';
import {
  Search, CheckCircle, LogOut, UserCheck, ShieldCheck,
  Camera, X, AlertTriangle, Check, BellRing, Sparkles, Trash2
} from 'lucide-react';

type Member = { _id: string; name: string; email: string; phone?: string };
type Attendance = {
  _id: string;
  member: { _id: string; name: string; email: string; phone?: string };
  checkInAt: string;
  checkOutAt?: string;
  recordedBy?: { name: string; role?: string };
  approvedBy?: { name: string; email?: string };
  approvedAt?: string;
  photoUrl?: string;
  verificationMethod?: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  location?: string;
};

export default function AttendancePage() {
  const [items, setItems] = useState<Attendance[]>([]);
  const [pendingItems, setPendingItems] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({ date });
    api<{ items: Attendance[] }>(`/attendance?${qs}`)
      .then(r => setItems(r.items))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function loadPending() {
    api<{ items: Attendance[]; count: number }>('/attendance/pending')
      .then(r => setPendingItems(r.items || []))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    loadPending();
    api<{ items: Member[] }>('/members?limit=200')
      .then(r => setMembers(r.items))
      .catch(() => {});

    // Poll for pending check-ins every 15s
    const timer = setInterval(loadPending, 15000);
    return () => clearInterval(timer);
  }, [date]);

  async function checkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId.trim()) return;
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      await api('/attendance', { method: 'POST', body: JSON.stringify({ member: memberId.trim() }) });
      setSuccess('Check-in recorded successfully!');
      setMemberId('');
      load();
      loadPending();
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function checkOut(id: string) {
    setError('');
    try {
      await api(`/attendance/${id}/checkout`, { method: 'PATCH', body: '{}' });
      load();
      loadPending();
    } catch(err) { setError(err instanceof Error ? err.message : 'Check-out failed'); }
  }

  async function approveCheckIn(id: string) {
    setProcessingId(id);
    setError('');
    try {
      await api(`/attendance/${id}/approve`, { method: 'PATCH', body: '{}' });
      setSuccess('Member check-in approved! Access confirmed.');
      load();
      loadPending();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectCheckIn(id: string) {
    const reason = window.prompt('Enter reason for rejecting this check-in:', 'Photo verification failed / Not recognized');
    if (reason === null) return;
    setProcessingId(id);
    setError('');
    try {
      await api(`/attendance/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });
      setSuccess('Check-in rejected.');
      load();
      loadPending();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteAttendance(id: string, memberName?: string) {
    const label = memberName ? `for ${memberName}` : '';
    if (!window.confirm(`Are you sure you want to delete this check-in record ${label}?`)) return;
    try {
      await api(`/attendance/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(a => a._id !== id));
      setPendingItems(prev => prev.filter(a => a._id !== id));
      setSuccess('Attendance record deleted.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete attendance record');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Attendance & Access Register</h1>
          <p className="muted">Live selfie check-ins, front desk register & real-time member approvals</p>
        </div>
      </div>

      {success && (
        <div className="status-banner status-green" style={{ marginBottom: 20 }}>
          <CheckCircle size={18} />
          <span>{success}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setSuccess('')}>×</button>
        </div>
      )}
      {error && (
        <div className="status-banner status-red" style={{ marginBottom: 20 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* ─── PENDING LIVE CHECK-IN APPROVALS QUEUE ─── */}
      {pendingItems.length > 0 && (
        <div
          className="dash-card"
          style={{
            marginBottom: 24,
            border: '2px solid rgba(255, 209, 102, 0.6)',
            background: 'linear-gradient(135deg, rgba(30, 24, 10, 0.95), rgba(18, 15, 8, 0.95))',
            boxShadow: '0 0 30px rgba(255, 209, 102, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#ffd166', display: 'flex', alignItems: 'center', gap: 10 }}>
              <BellRing size={20} className="pulse-dot" style={{ background: '#ffd166' }} />
              Live Check-In Approvals Required ({pendingItems.length})
            </h3>
            <span className="badge badge-yellow" style={{ fontSize: 11 }}>Action Required</span>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 16px 0' }}>
            Members have submitted their live camera selfies at the entrance. Review their verification photos below and approve their access.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {pendingItems.map(p => (
              <div
                key={p._id}
                style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt="Selfie verification"
                    className="attendance-photo-thumb"
                    style={{ width: 62, height: 62, borderRadius: 10 }}
                    onClick={() => setPreviewPhoto(p.photoUrl!)}
                    title="Click to zoom verification photo"
                  />
                ) : (
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 10,
                      background: '#1a1f1b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Camera size={24} className="accent" />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 14, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.member?.name || 'Member'}
                  </strong>
                  <span style={{ fontSize: 11, color: '#8e968c', display: 'block' }}>
                    {new Date(p.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • {p.location || 'Main Floor'}
                  </span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      className="btn btn-green btn-sm"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      disabled={processingId === p._id}
                      onClick={() => approveCheckIn(p._id)}
                    >
                      <Check size={13} /> {processingId === p._id ? '…' : 'Approve'}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: '4px 8px', fontSize: 11, borderColor: 'rgba(255, 107, 107, 0.4)', color: '#ff6b6b' }}
                      disabled={processingId === p._id}
                      onClick={() => rejectCheckIn(p._id)}
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dash-grid-2">
        {/* Check-in form */}
        <div className="dash-card">
          <h3><UserCheck size={20} style={{ color: 'var(--green)', marginRight: '8px' }}/> Record Front Desk Check-In</h3>
          <form onSubmit={checkIn} className="form-grid" style={{ marginTop: '14px' }}>
            <label className="full-width">Select Member to Check In *
              <select
                value={memberId}
                onChange={e => setMemberId(e.target.value)}
                required
              >
                <option value="">-- Choose Member from Register --</option>
                {members.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.email}{m.phone ? ` · ${m.phone}` : ''})
                  </option>
                ))}
              </select>
            </label>

            <div className="full-width" style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-green full" disabled={submitting || !memberId}>
                <CheckCircle size={16}/> {submitting ? 'Checking in…' : 'Record Instant Check-In'}
              </button>
            </div>
          </form>
        </div>

        {/* Date picker */}
        <div className="dash-card">
          <h3>Date Filter & Gym Floor Count</h3>
          <div style={{ marginTop: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9b9f9a', fontWeight: 600 }}>
              Viewing Date
              <input type="date" value={date} onChange={e => setDate(e.target.value)}/>
            </label>
            <div style={{ marginTop: '20px', padding: '16px', background: '#090b0a', borderRadius: '6px', border: '1px solid #242924' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: '12px' }}>Total check-ins on this date:</span>
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: '24px', fontWeight: 800, color: 'var(--green)' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span className="muted" style={{ fontSize: '12px' }}>Currently in gym (open sessions):</span>
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: '20px', fontWeight: 800, color: '#ffd166' }}>
                  {items.filter(i => !i.checkOutAt && i.status !== 'rejected').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-card mt-4">
        {loading ? <div className="page-loading"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Verification</th>
                  <th>Member</th>
                  <th>Check-In Time</th>
                  <th>Check-Out Time</th>
                  <th>Approval Status</th>
                  <th>Session Duration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="empty-td">No attendance records for {date}.</td></tr>
                ) : (
                  items.map(a => {
                    const dur = a.checkOutAt
                      ? `${Math.round((new Date(a.checkOutAt).getTime() - new Date(a.checkInAt).getTime()) / 60000)} min`
                      : 'Still in session';
                    const isPending = a.status === 'pending';
                    const isRejected = a.status === 'rejected';

                    return (
                      <tr key={a._id}>
                        <td>
                          {a.photoUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <img
                                src={a.photoUrl}
                                alt="Selfie Proof"
                                className="attendance-photo-thumb"
                                onClick={() => setPreviewPhoto(a.photoUrl!)}
                                title="Click to view full photo proof"
                              />
                              <span className="badge badge-green" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <ShieldCheck size={11} /> Selfie
                              </span>
                            </div>
                          ) : (
                            <span className="badge badge-outline" style={{ fontSize: 10 }}>
                              Front Desk
                            </span>
                          )}
                        </td>
                        <td><strong>{a.member?.name}</strong><br/><small className="muted">{a.member?.email}</small></td>
                        <td>{new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</td>
                        <td>{a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : <span className="badge badge-green">Currently Active</span>}</td>
                        <td>
                          {isPending ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="badge badge-yellow">Pending</span>
                              <button
                                className="btn btn-green btn-sm"
                                style={{ padding: '2px 8px', fontSize: 10 }}
                                onClick={() => approveCheckIn(a._id)}
                              >
                                Approve
                              </button>
                            </div>
                          ) : isRejected ? (
                            <span className="badge badge-red" title={a.rejectionReason}>Rejected</span>
                          ) : (
                            <span className="badge badge-green">Approved</span>
                          )}
                        </td>
                        <td><span className={a.checkOutAt ? 'muted' : 'badge badge-yellow'}>{dur}</span></td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {!a.checkOutAt && !isRejected && (
                              <button className="btn btn-outline btn-sm" onClick={() => checkOut(a._id)}>
                                <LogOut size={13}/> Check Out
                              </button>
                            )}
                            <button
                              className="icon-btn danger"
                              style={{ padding: '5px' }}
                              onClick={() => deleteAttendance(a._id, a.member?.name)}
                              title="Delete Check-in Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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

      {/* Admin Photo Lightbox Modal */}
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
                alt="Member live selfie"
                style={{ width: '100%', borderRadius: 12, border: '2px solid rgba(181, 242, 61, 0.4)', boxShadow: '0 8px 30px rgba(0,0,0,0.8)' }}
              />
              <p style={{ margin: '14px 0 0 0', fontSize: 12, color: '#9b9f9a' }}>
                Selfie verification captured during member self check-in.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
