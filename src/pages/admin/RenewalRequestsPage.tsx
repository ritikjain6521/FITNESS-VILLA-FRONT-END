import React, { useEffect, useState } from 'react';
import { api, money, fmt } from '../../api';
import {
  RefreshCw, CheckCircle, AlertTriangle, X, Check,
  Clock, User, DollarSign, Calendar, MessageSquare, ShieldCheck
} from 'lucide-react';

type RenewalRequest = {
  _id: string;
  member: { _id: string; name: string; email: string; phone?: string };
  requestedPlan: { _id: string; name: string; pricePaise: number; durationDays: number; features?: string[] };
  currentMembership?: { plan?: { name: string } };
  requestType: 'renewal' | 'upgrade';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  adminNotes?: string;
  preferredStartDate?: string;
  createdAt: string;
  reviewedBy?: { name: string; email: string };
};

export default function RenewalRequestsPage() {
  const [items, setItems] = useState<RenewalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Review modal
  const [selectedRequest, setSelectedRequest] = useState<RenewalRequest | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [activateMembership, setActivateMembership] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  function loadRequests() {
    setLoading(true);
    setError('');
    const qs = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
    api<{ items: RenewalRequest[] }>(`/renewal-requests${qs}`)
      .then(res => setItems(res.items || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  function openActionModal(req: RenewalRequest, type: 'approved' | 'rejected') {
    setSelectedRequest(req);
    setActionType(type);
    setAdminNotes(type === 'approved' ? 'Approved by gym management. Pass activated.' : 'Unable to approve at this time.');
    setActivateMembership(true);
    setModalOpen(true);
  }

  async function handleConfirmAction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRequest) return;

    setProcessingId(selectedRequest._id);
    setError('');

    try {
      await api(`/renewal-requests/${selectedRequest._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: actionType,
          adminNotes,
          activateMembership: actionType === 'approved' ? activateMembership : false,
        }),
      });

      setSuccess(`Request successfully ${actionType === 'approved' ? 'approved & membership updated' : 'rejected'}.`);
      setModalOpen(false);
      loadRequests();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Member Renewal &amp; Upgrade Requests</h1>
          <p className="muted">Review and approve self-service membership extension requests from gym members</p>
        </div>
        <div className="page-actions">
          <select
            className="select-input"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="pending">Pending Requests</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Requests</option>
          </select>
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
          <span>Loading member renewal requests…</span>
        </div>
      )}

      {!loading && (
        <div className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={17} className="accent" />
            <strong style={{ fontSize: 14 }}>Renewal &amp; Upgrade Applications</strong>
            <span className="badge badge-green" style={{ marginLeft: 'auto' }}>{items.length} requests</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Request Type</th>
                  <th>Requested Tier</th>
                  <th>Price</th>
                  <th>Member Note</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="empty-td">No {filterStatus !== 'all' ? filterStatus : ''} renewal requests found.</td></tr>
                ) : (
                  items.map(r => (
                    <tr key={r._id}>
                      <td>
                        <strong>{r.member?.name || 'Member'}</strong>
                        <br />
                        <small className="muted">{r.member?.email} {r.member?.phone ? `• ${r.member.phone}` : ''}</small>
                      </td>
                      <td>
                        <span className="pill" style={{ textTransform: 'capitalize' }}>
                          {r.requestType}
                        </span>
                      </td>
                      <td>
                        <strong>{r.requestedPlan?.name || '—'}</strong>
                        <br />
                        <small className="muted">{r.requestedPlan?.durationDays} Days</small>
                      </td>
                      <td>{r.requestedPlan ? money(r.requestedPlan.pricePaise) : '—'}</td>
                      <td>
                        <span style={{ fontSize: 12, color: r.notes ? '#e0e5de' : '#8e968c' }}>
                          {r.notes || 'No special notes'}
                        </span>
                      </td>
                      <td>{fmt(r.createdAt)}</td>
                      <td>
                        <span className={`badge ${
                          r.status === 'approved' || r.status === 'completed'
                            ? 'badge-green'
                            : r.status === 'pending'
                            ? 'badge-yellow'
                            : 'badge-red'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-green btn-sm"
                              style={{ padding: '4px 10px', fontSize: 11 }}
                              onClick={() => openActionModal(r, 'approved')}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px', fontSize: 11, borderColor: 'rgba(255, 87, 87, 0.4)', color: '#ff6b6b' }}
                              onClick={() => openActionModal(r, 'rejected')}
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {r.reviewedBy ? `Reviewed by ${r.reviewedBy.name}` : 'Processed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {modalOpen && selectedRequest && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !processingId) setModalOpen(false); }}>
          <div className="modal-dialog" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>
                {actionType === 'approved' ? (
                  <CheckCircle size={18} className="accent" />
                ) : (
                  <AlertTriangle size={18} style={{ color: '#ff6b6b' }} />
                )}
                {actionType === 'approved' ? 'Approve Renewal Request' : 'Reject Renewal Request'}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)} disabled={Boolean(processingId)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="modal-body">
              {error && (
                <div className="error-msg" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={15} /> {error}
                </div>
              )}

              <div style={{ background: '#090b0a', padding: 14, borderRadius: 8, border: '1px solid #242924', marginBottom: 16 }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <span className="muted">Member:</span> <strong>{selectedRequest.member?.name}</strong>
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <span className="muted">Requested Plan:</span> <strong>{selectedRequest.requestedPlan?.name}</strong> ({money(selectedRequest.requestedPlan?.pricePaise || 0)})
                </div>
                <div style={{ fontSize: 13 }}>
                  <span className="muted">Request Type:</span> <span className="pill" style={{ textTransform: 'capitalize' }}>{selectedRequest.requestType}</span>
                </div>
              </div>

              {actionType === 'approved' && (
                <label className="full-width" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
                  <input
                    type="checkbox"
                    checked={activateMembership}
                    onChange={e => setActivateMembership(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                  />
                  <span style={{ fontSize: 13 }}>
                    <strong>Automatically activate new membership pass</strong> for this member starting today
                  </span>
                </label>
              )}

              <label className="full-width">
                Admin Notes (Sent to member / audit log)
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Notes or instructions for member..."
                />
              </label>

              <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalOpen(false)}
                  disabled={Boolean(processingId)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${actionType === 'approved' ? 'btn-green' : 'btn-outline'}`}
                  style={actionType === 'rejected' ? { borderColor: '#ff6b6b', color: '#ff6b6b' } : {}}
                  disabled={Boolean(processingId)}
                >
                  {processingId ? 'Processing…' : actionType === 'approved' ? 'Approve & Confirm' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
