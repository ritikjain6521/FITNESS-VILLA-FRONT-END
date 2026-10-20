import { useEffect, useState } from 'react';
import { api, fmt } from '../api';
import { Search, CheckCircle, LogOut, UserCheck } from 'lucide-react';

type Member = { _id: string; name: string; email: string; phone?: string };
type Attendance = { _id: string; member: { _id: string; name: string; email: string }; checkInAt: string; checkOutAt?: string; recordedBy: { name: string } };

export default function AttendancePage() {
  const [items, setItems] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({ date });
    api<{ items: Attendance[] }>(`/attendance?${qs}`)
      .then(r => setItems(r.items))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api<{ items: Member[] }>('/members?limit=200')
      .then(r => setMembers(r.items))
      .catch(() => {});
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
    } catch(err) { setError(err instanceof Error ? err.message : 'Check-out failed'); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p className="muted">Daily gym check-in & access register</p>
        </div>
      </div>

      <div className="dash-grid-2">
        {/* Check-in form */}
        <div className="dash-card">
          <h3><UserCheck size={20} style={{ color: 'var(--green)', marginRight: '8px' }}/> Record Member Check-In</h3>
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

            {error && <p className="error-msg full-width">{error}</p>}
            {success && <p className="success-msg full-width">{success}</p>}

            <div className="full-width" style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-green full" disabled={submitting || !memberId}>
                <CheckCircle size={16}/> {submitting ? 'Checking in…' : 'Record Check-In Now'}
              </button>
            </div>
          </form>
        </div>

        {/* Date picker */}
        <div className="dash-card">
          <h3>Date Filter & Status</h3>
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
                <span className="muted" style={{ fontSize: '12px' }}>Currently on gym floor:</span>
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: '20px', fontWeight: 800, color: '#ffd166' }}>
                  {items.filter(i => !i.checkOutAt).length}
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
              <thead><tr><th>Member</th><th>Check-In Time</th><th>Check-Out Time</th><th>Session Duration</th><th>Action</th></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={5} className="empty-td">No attendance records for {date}.</td></tr> :
                  items.map(a => {
                    const dur = a.checkOutAt
                      ? `${Math.round((new Date(a.checkOutAt).getTime() - new Date(a.checkInAt).getTime()) / 60000)} min`
                      : 'Still in session';
                    return (
                      <tr key={a._id}>
                        <td><strong>{a.member.name}</strong><br/><small className="muted">{a.member.email}</small></td>
                        <td>{new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</td>
                        <td>{a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : <span className="badge badge-green">Currently Active</span>}</td>
                        <td><span className={a.checkOutAt ? 'muted' : 'badge badge-yellow'}>{dur}</span></td>
                        <td>{!a.checkOutAt && <button className="btn btn-outline btn-sm" onClick={() => checkOut(a._id)}><LogOut size={13}/>Check Out</button>}</td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
