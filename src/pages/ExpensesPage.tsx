import { useEffect, useState } from 'react';
import { api, money, fmt } from '../api';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type Category = { _id: string; name: string };
type Expense = { _id: string; category: { _id: string; name: string }; date: string; amountPaise: number; vendor: string; paymentMethod: string; notes?: string };

export default function ExpensesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', date: new Date().toISOString().split('T')[0], amountPaise: '', vendor: '', paymentMethod: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api<{ items: Expense[]; totalAmountPaise: number }>('/expenses'),
      api<{ items: Category[] }>('/expenses/categories'),
    ]).then(([e, c]) => { setItems(e.items); setTotal(e.totalAmountPaise); setCategories(c.items); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api('/expenses', { method:'POST', body: JSON.stringify({ ...form, amountPaise: Math.round(Number(form.amountPaise)*100), date: new Date(form.date) }) });
      setShowForm(false); load();
    } catch(err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  }

  async function voidExpense(id: string) {
    if (!confirm('Void this expense?')) return;
    await api(`/expenses/${id}`, { method:'DELETE', body:'{}' }).catch(e => alert(e.message));
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Expenses</h1><p className="muted">Total: <strong>{money(total)}</strong></p></div>
        <div className="page-actions">
          <button className="btn btn-green" onClick={() => setShowForm(s=>!s)}><Plus size={16}/> Add Expense</button>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>Record Expense</h3>
          <form onSubmit={submit} className="form-grid">
            <label>Category *
              <select required value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </label>
            <label>Date *<input type="date" required value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}/></label>
            <label>Amount (₹) *<input type="number" required min="0.01" step="0.01" value={form.amountPaise} onChange={e => setForm(f=>({...f,amountPaise:e.target.value}))} placeholder="e.g. 3500"/></label>
            <label>Vendor<input value={form.vendor} onChange={e => setForm(f=>({...f,vendor:e.target.value}))} placeholder="Supplier / Payee name"/></label>
            <label>Method<select value={form.paymentMethod} onChange={e => setForm(f=>({...f,paymentMethod:e.target.value}))}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option>
            </select></label>
            <label className="full-width">Notes<input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes"/></label>
            {error && <p className="error-msg full-width">{error}</p>}
            <div className="form-actions full-width">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>{saving ? 'Saving…' : 'Save Expense'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="page-loading"><div className="spinner"/></div> : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Vendor</th><th>Method</th><th>Notes</th>{user?.role === 'admin' && <th></th>}</tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={7} className="empty-td">No expenses yet.</td></tr> :
                  items.map(e => (
                    <tr key={e._id}>
                      <td>{fmt(e.date)}</td>
                      <td>{e.category?.name}</td>
                      <td>{money(e.amountPaise)}</td>
                      <td>{e.vendor || '—'}</td>
                      <td><span className="pill">{e.paymentMethod}</span></td>
                      <td className="muted">{e.notes || '—'}</td>
                      {user?.role === 'admin' && <td><button className="icon-btn danger" onClick={() => voidExpense(e._id)}><Trash2 size={15}/></button></td>}
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
