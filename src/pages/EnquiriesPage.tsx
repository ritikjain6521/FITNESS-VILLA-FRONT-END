import { useEffect, useState } from 'react';
import { api, fmt } from '../api';
import { MessageSquare } from 'lucide-react';

type Enquiry = { _id: string; name: string; email?: string; phone?: string; message: string; interest: string; status: string; createdAt: string };

const statusColors: Record<string, string> = {
  new: 'badge-green', contacted: 'badge-yellow', converted: 'badge-orange', closed: 'badge-red'
};

export default function EnquiriesPage() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  function load() {
    const qs = new URLSearchParams({ limit: '100', ...(status ? { status } : {}) });
    api<{ items: Enquiry[] }>(`/enquiries?${qs}`)
      .then(r => setItems(r.items))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [status]);

  async function updateStatus(id: string, s: string) {
    await api(`/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status: s }) });
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Enquiries</h1><p className="muted">{items.length} enquiries</p></div>
      </div>

      <div className="filter-bar">
        <label>Status:
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      {loading ? <div className="page-loading"><div className="spinner"/></div> : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Contact</th><th>Interest</th><th>Message</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={7} className="empty-td">No enquiries yet.</td></tr> :
                  items.map(e => (
                    <tr key={e._id}>
                      <td><strong>{e.name}</strong></td>
                      <td><small>{e.email || '—'}<br/>{e.phone || '—'}</small></td>
                      <td><span className="pill">{e.interest.replace('_', ' ')}</span></td>
                      <td className="muted" style={{ maxWidth:200, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.message}</td>
                      <td><span className={`badge ${statusColors[e.status]}`}>{e.status}</span></td>
                      <td>{fmt(e.createdAt)}</td>
                      <td>
                        <select value={e.status} onChange={ev => updateStatus(e._id, ev.target.value)} className="inline-select">
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="converted">Converted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
