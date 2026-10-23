import React, { useEffect, useState } from 'react';
import { api, money } from '../../api';
import {
  Tag, Plus, Edit2, Trash2, CheckCircle, AlertTriangle,
  X, Check, Sparkles, Clock, DollarSign, Layers
} from 'lucide-react';

type Plan = {
  _id: string;
  name: string;
  description: string;
  pricePaise: number;
  durationDays: number;
  features: string[];
  active: boolean;
};

export default function PlansManagementPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function loadPlans() {
    setLoading(true);
    setError('');
    api<{ items: Plan[] }>('/plans?all=true')
      .then(res => setPlans(res.items || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPlans();
  }, []);

  function openCreateModal() {
    setEditingPlan(null);
    setName('');
    setPriceRupees('');
    setDurationDays('30');
    setDescription('');
    setFeaturesText('');
    setActive(true);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(plan: Plan) {
    setEditingPlan(plan);
    setName(plan.name);
    setPriceRupees(String(plan.pricePaise / 100));
    setDurationDays(String(plan.durationDays));
    setDescription(plan.description || '');
    setFeaturesText((plan.features || []).join('\n'));
    setActive(plan.active !== false);
    setError('');
    setModalOpen(true);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    const rupees = parseFloat(priceRupees);
    if (isNaN(rupees) || rupees < 0) {
      setError('Please enter a valid price.');
      return;
    }

    const duration = parseInt(durationDays, 10);
    if (isNaN(duration) || duration <= 0) {
      setError('Please enter valid duration in days.');
      return;
    }

    const features = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      pricePaise: Math.round(rupees * 100),
      durationDays: duration,
      features,
      active,
    };

    setSubmitting(true);
    setError('');

    try {
      if (editingPlan) {
        await api(`/plans/${editingPlan._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setSuccess(`Plan "${name}" updated successfully! Visible on landing page.`);
      } else {
        await api('/plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess(`New plan "${name}" created successfully! Visible on landing page.`);
      }

      setModalOpen(false);
      loadPlans();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(plan: Plan) {
    try {
      await api(`/plans/${plan._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !plan.active }),
      });
      loadPlans();
      setSuccess(`Plan status changed to ${!plan.active ? 'Active' : 'Inactive'}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update plan status');
    }
  }

  async function handleDeletePlan(plan: Plan) {
    const confirm = window.confirm(
      `Are you sure you want to deactivate/delete plan "${plan.name}"?`
    );
    if (!confirm) return;

    try {
      await api(`/plans/${plan._id}?hard=true`, { method: 'DELETE' });
      setSuccess(`Plan "${plan.name}" removed successfully.`);
      loadPlans();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete plan');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Membership Plans &amp; Tiers</h1>
          <p className="muted">
            Manage membership tiers appearing on the front-end landing page and member portal
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-green" onClick={openCreateModal}>
            <Plus size={16} /> Add New Plan
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
          <span>Loading membership tiers…</span>
        </div>
      )}

      {/* Plans Card Grid */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 30 }}>
          {plans.map(p => (
            <div
              key={p._id}
              className="dash-card"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: p.active ? '1px solid rgba(181, 242, 61, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                opacity: p.active ? 1 : 0.65,
                background: p.active
                  ? 'linear-gradient(135deg, rgba(18, 25, 20, 0.9), rgba(10, 14, 11, 0.9))'
                  : '#0f1311',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span className="pill" style={{ color: 'var(--green)', borderColor: 'rgba(181, 242, 61, 0.3)' }}>
                    <Clock size={11} style={{ marginRight: 4 }} /> {p.durationDays} Days Pass
                  </span>
                  <span className={`badge ${p.active ? 'badge-green' : 'badge-outline'}`}>
                    {p.active ? 'Active on Landing' : 'Inactive'}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 6px 0', fontSize: 18 }}>{p.name}</h3>
                <div style={{ fontSize: 26, fontFamily: 'Barlow Condensed', fontWeight: 800, color: '#fff', marginBottom: 10 }}>
                  {money(p.pricePaise)} <span style={{ fontSize: 13, fontWeight: 400, color: '#8e968c' }}>/ {p.durationDays} days</span>
                </div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                  {p.description || 'Full club access and training privileges.'}
                </p>

                {/* Features List */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(p.features || []).map((f, idx) => (
                    <li key={idx} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#cfd6cc' }}>
                      <Check size={14} className="accent" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan Actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEditModal(p)}>
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{
                    borderColor: p.active ? 'rgba(255, 209, 102, 0.4)' : 'rgba(181, 242, 61, 0.4)',
                    color: p.active ? '#ffd166' : 'var(--green)',
                  }}
                  onClick={() => handleToggleActive(p)}
                >
                  {p.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'rgba(255, 87, 87, 0.4)', color: '#ff6b6b' }}
                  onClick={() => handleDeletePlan(p)}
                  title="Delete Plan"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) setModalOpen(false); }}>
          <div className="modal-dialog" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3>
                <Tag size={18} className="accent" />
                {editingPlan ? 'Edit Membership Plan' : 'Create New Membership Plan'}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)} disabled={submitting}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="modal-body">
              {error && (
                <div className="error-msg" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={15} /> {error}
                </div>
              )}

              <div className="form-grid">
                <label className="full-width">
                  Plan Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Iron Elite, Monthly Power Pass"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </label>

                <label>
                  Price in Rupees (₹) *
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 2499"
                    value={priceRupees}
                    onChange={e => setPriceRupees(e.target.value)}
                  />
                </label>

                <label>
                  Duration (Days) *
                  <input
                    type="number"
                    min="1"
                    max="730"
                    required
                    placeholder="e.g. 30, 90, 365"
                    value={durationDays}
                    onChange={e => setDurationDays(e.target.value)}
                  />
                </label>

                <label className="full-width">
                  Description
                  <textarea
                    rows={2}
                    placeholder="Brief highlights of this membership pass"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </label>

                <label className="full-width">
                  Features (One per line)
                  <textarea
                    rows={4}
                    placeholder={'Unlimited gym floor access\nLocker & shower facilities\nPersonal training orientation\nSteam & recovery zone'}
                    value={featuresText}
                    onChange={e => setFeaturesText(e.target.value)}
                  />
                  <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                    Each line becomes a bullet point with a green checkmark on the landing page.
                  </small>
                </label>

                <label className="full-width" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 6 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                  />
                  <span>Active &amp; Visible on Front-End Landing Page</span>
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
                  disabled={submitting || !name || !priceRupees}
                >
                  {submitting ? 'Saving Plan…' : editingPlan ? 'Save Changes' : 'Create & Publish Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
