import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmt } from '../api';
import { Search, UserPlus, Edit, ChevronRight, Trash2 } from 'lucide-react';

type Member = { _id: string; name: string; email: string; phone?: string; role: string; active: boolean; createdAt: string };

export default function MembersPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const limit = 20;

  function load(p = 1, s = search) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit), ...(s ? { search: s } : {}) });
    api<{ items: Member[]; total: number }>(`/members?${params}`)
      .then(r => { setItems(r.items); setTotal(r.total); setPage(p); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(1, ''); }, []);

  function handleSearch(e: React.FormEvent) { e.preventDefault(); load(1, search); }

  async function deleteMember(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete/deactivate member "${name}"?`)) return;
    try {
      await api(`/members/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(m => m._id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (err: any) {
      alert(err.message || 'Failed to delete member');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Members</h1>
          <p className="muted">{total} total members</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-green" onClick={() => navigate('/dashboard/members/new')}>
            <UserPlus size={16}/> Add Member
          </button>
        </div>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-input-wrap">
          <Search size={16} className="search-icon"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone…"/>
        </div>
        <button className="btn btn-outline" type="submit">Search</button>
      </form>

      {error && <p className="error-msg">{error}</p>}

      {loading ? <div className="page-loading"><div className="spinner"/></div> : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="empty-td">No members found.</td></tr>
                ) : items.map(m => (
                  <tr key={m._id} className="clickable" onClick={() => navigate(`/dashboard/members/${m._id}`)}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.email}</td>
                    <td>{m.phone || '—'}</td>
                    <td><span className="pill">{m.role}</span></td>
                    <td><span className={`badge ${m.active ? 'badge-green' : 'badge-red'}`}>{m.active ? 'Active' : 'Inactive'}</span></td>
                    <td>{fmt(m.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className="icon-btn danger"
                          style={{ padding: '6px' }}
                          onClick={(e) => deleteMember(e, m._id, m.name)}
                          title="Delete Member"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={16} className="muted" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
            <span className="muted">Page {page} of {Math.ceil(total / limit) || 1}</span>
            <button className="btn btn-outline btn-sm" disabled={page * limit >= total} onClick={() => load(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
