import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

type Member = { _id: string; name: string; email: string; phone?: string; role: string; active: boolean };

export default function EditMemberPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api<{ item: Member }>(`/members/${id}`)
      .then(r => {
        setMember(r.item);
        setName(r.item.name);
        setPhone(r.item.phone || '');
        setActive(r.item.active);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await api(`/members/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), active }),
      });
      navigate(`/dashboard/members/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner"/><span>Loading member details…</span></div>;
  if (!member) return <div className="page-error">Member not found.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate(`/dashboard/members/${id}`)}><ArrowLeft size={16}/>Back to Profile</button>
          <h1>Edit Member Profile</h1>
          <p className="muted">{member.email}</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} className="form-grid">
          <label>Full Name *
            <input
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <label>Phone Number
            <input
              maxLength={25}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </label>

          <label>Email Address (Immutable)
            <input
              type="email"
              disabled
              value={member.email}
              style={{ background: '#161a17', color: '#8d928b' }}
            />
          </label>

          <label>Account Role (Managed by Admin)
            <input
              type="text"
              disabled
              value={member.role.toUpperCase()}
              style={{ background: '#161a17', color: '#8d928b' }}
            />
          </label>

          <div className="full-width" style={{ marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Account Active (Active members can check-in and access gym facilities)
            </label>
          </div>

          {error && <p className="error-msg full-width">{error}</p>}

          <div className="form-actions full-width">
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/dashboard/members/${id}`)}>Cancel</button>
            <button type="submit" className="btn btn-green" disabled={saving}>
              <Save size={16}/>{saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
