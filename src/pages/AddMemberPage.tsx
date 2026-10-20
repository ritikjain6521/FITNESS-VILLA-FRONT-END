import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function AddMemberPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await api<{ item: { _id: string } }>('/members', { method: 'POST', body: JSON.stringify(form) });
      navigate(`/dashboard/members/${r.item._id}`);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Failed to create member');
    } finally { setLoading(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={16}/>Back</button>
          <h1>Add New Member</h1>
        </div>
      </div>
      <div className="form-card">
        <form onSubmit={handleSubmit} className="form-grid">
          <label>Full Name *
            <input required minLength={2} maxLength={100} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rahul Sharma"/>
          </label>
          <label>Email Address *
            <input type="email" required maxLength={254} value={form.email} onChange={e => set('email', e.target.value)} placeholder="member@example.com"/>
          </label>
          <label>Phone Number
            <input maxLength={25} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210"/>
          </label>
          <label>Role
            <select value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="member">Member</option>
              <option value="trainer">Trainer</option>
              <option value="staff">Staff</option>
            </select>
          </label>
          <label className="full-width">Initial Password *
            <input type="password" required minLength={10} maxLength={128} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimum 10 characters"/>
          </label>
          {error && <p className="error-msg full-width">{error}</p>}
          <div className="form-actions full-width">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-green" disabled={loading}>
              <UserPlus size={16}/>{loading ? 'Creating…' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
