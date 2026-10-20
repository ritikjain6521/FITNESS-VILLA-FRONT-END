import React, { useState } from 'react';
import { api, money, fmt, downloadFile } from '../api';
import {
  BarChart2,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type DatePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

function getRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const fmtIso = (d: Date) => d.toISOString().split('T')[0];
  if (preset === 'today') return { from: fmtIso(now), to: fmtIso(now) };
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: fmtIso(y), to: fmtIso(y) };
  }
  if (preset === 'last7') {
    const s = new Date(now);
    s.setDate(s.getDate() - 6);
    return { from: fmtIso(s), to: fmtIso(now) };
  }
  if (preset === 'thisMonth') return { from: fmtIso(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmtIso(now) };
  if (preset === 'lastMonth') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmtIso(s), to: fmtIso(e) };
  }
  if (preset === 'thisYear') return { from: `${now.getFullYear()}-01-01`, to: fmtIso(now) };
  return { from: fmtIso(now), to: fmtIso(now) };
}

type Summary = {
  revenuePaise: number;
  membershipRevenuePaise?: number;
  storeSalesPaise?: number;
  expensesPaise: number;
  profitPaise: number;
  newMembers: number;
  activeMemberships: number;
};
type PaymentRec = { _id: string; receiptNumber?: string; member?: { name: string; phone?: string }; amountPaise: number; method: string; paidAt?: string; notes?: string };
type ByMethod = { _id: string; total: number; count: number };

export default function ReportsPage() {
  const [preset, setPreset] = useState<DatePreset>('thisMonth');
  const [from, setFrom] = useState(getRange('thisMonth').from);
  const [to, setTo] = useState(getRange('thisMonth').to);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byMethod, setByMethod] = useState<ByMethod[]>([]);
  const [payments, setPayments] = useState<PaymentRec[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  // Export state
  const [exportType, setExportType] = useState('payments');
  const [exporting, setExporting] = useState(false);

  // Import Modal State
  const [showImport, setShowImport] = useState(false);
  const [importTarget, setImportTarget] = useState<'members' | 'products'>('members');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ message?: string; errors?: string[] } | null>(null);

  function applyPreset(p: DatePreset) {
    setPreset(p);
    if (p !== 'custom') {
      const r = getRange(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  async function run() {
    setLoading(true);
    setRan(true);
    const qs = new URLSearchParams({ from, to });
    const [s, p] = await Promise.all([
      api<Summary>(`/reports/summary?${qs}`),
      api<{ items: PaymentRec[]; byMethod: ByMethod[] }>(`/reports/payments?${qs}`),
    ]).catch(() => [null, null] as any);
    if (s) setSummary(s);
    if (p) {
      setByMethod(p.byMethod || []);
      setPayments(p.items || []);
    }
    setLoading(false);
  }

  async function handleExport(format: 'xlsx' | 'csv') {
    setExporting(true);
    try {
      const qs = new URLSearchParams({ from, to, format });
      const filename = `${exportType}_report_${from}_to_${to}.${format}`;
      await downloadFile(`/reports/export/${exportType}?${qs}`, filename);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      await downloadFile(`/reports/template/${importTarget}`, `${importTarget}_template.xlsx`);
    } catch (err: any) {
      alert(err.message || 'Template download failed');
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api<any>(`/reports/import/${importTarget}`, {
        method: 'POST',
        body: formData,
      });
      setImportResult({ message: res.message, errors: res.errors });
      setImportFile(null);
    } catch (err: any) {
      setImportResult({ errors: [err.message || 'Import failed'] });
    } finally {
      setImporting(false);
    }
  }

  const presets: { label: string; value: DatePreset }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last7' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'Custom', value: 'custom' },
  ];

  const chartData = byMethod.map((b) => ({ name: b._id.toUpperCase(), total: b.total / 100, count: b.count }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Financial & Operational Reports</h1>
          <p className="muted">Analytics, Excel/CSV exports, and bulk data imports</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => setShowImport(true)}>
            <Upload size={16} /> Bulk Import Data
          </button>
        </div>
      </div>

      {/* Date Filter & Run Bar */}
      <div className="form-card">
        <div className="preset-bar">
          {presets.map((p) => (
            <button
              key={p.value}
              className={`preset-btn ${preset === p.value ? 'active' : ''}`}
              onClick={() => applyPreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="form-grid mt-2">
            <label>
              From Date
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To Date
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        )}
        <div className="report-controls-bar">
          <button className="btn btn-green" onClick={run} disabled={loading}>
            <BarChart2 size={16} />
            {loading ? 'Generating…' : 'Generate Report'}
          </button>

          {/* Export Controls */}
          <div className="report-export-group">
            <span className="export-label">Export:</span>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              style={{ padding: '7px 12px', background: '#111412', color: '#fff', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '13px' }}
            >
              <option value="payments">Payments & Collections</option>
              <option value="dues">Outstanding Dues</option>
              <option value="members">Members Master</option>
              <option value="memberships">Active Memberships</option>
              <option value="expenses">Operating Expenses</option>
              <option value="inventory">Inventory & Stock</option>
              <option value="sales">POS Store Sales</option>
            </select>
            <div className="export-buttons">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleExport('xlsx')}
                disabled={exporting}
                title="Download Microsoft Excel File"
              >
                <FileSpreadsheet size={15} color="#22c55e" /> Excel (.xlsx)
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleExport('csv')}
                disabled={exporting}
                title="Download CSV File"
              >
                <FileText size={15} color="#38bdf8" /> CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="modal-backdrop" onClick={() => setShowImport(false)}>
          <div className="login-modal" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="eyebrow">BULK DATA IMPORT</div>
                <h2 style={{ fontSize: '26px', margin: '4px 0' }}>Import from Excel / CSV</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowImport(false)}><X size={18} /></button>
            </div>

            <div className="tab-nav" style={{ marginTop: '14px', marginBottom: '14px' }}>
              <button
                className={`tab-btn ${importTarget === 'members' ? 'active' : ''}`}
                onClick={() => { setImportTarget('members'); setImportResult(null); }}
              >
                Import Members
              </button>
              <button
                className={`tab-btn ${importTarget === 'products' ? 'active' : ''}`}
                onClick={() => { setImportTarget('products'); setImportResult(null); }}
              >
                Import Products / Stock
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--muted)' }}>
                Download the standardized Excel template with pre-formatted column headers to ensure smooth import.
              </p>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleDownloadTemplate}>
                <Download size={14} /> Download Sample {importTarget === 'members' ? 'Members' : 'Products'} Template (.xlsx)
              </button>
            </div>

            <form onSubmit={handleImportSubmit} style={{ display: 'grid', gap: '14px' }}>
              <label>
                Select Excel (.xlsx) or CSV (.csv) File
                <input
                  type="file"
                  required
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  style={{ marginTop: '6px' }}
                />
              </label>

              {importResult?.message && (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#86efac', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} /> {importResult.message}
                </div>
              )}

              {importResult?.errors && importResult.errors.length > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <AlertCircle size={15} /> Import Warnings ({importResult.errors.length}):
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowImport(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-green" style={{ flex: 1 }} disabled={importing || !importFile}>
                  <Upload size={16} /> {importing ? 'Importing…' : 'Upload & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Summary Cards */}
      {ran && summary && (
        <>
          <div className="kpi-grid mt-4">
            <div className="kpi-card kpi-accent">
              <div className="kpi-value">{money(summary.revenuePaise)}</div>
              <div className="kpi-label">Total Revenue (₹)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{money(summary.expensesPaise)}</div>
              <div className="kpi-label">Operating Expenses (₹)</div>
            </div>
            <div className="kpi-card kpi-accent">
              <div className="kpi-value" style={{ color: summary.profitPaise >= 0 ? 'var(--green)' : '#ef4444' }}>
                {money(summary.profitPaise)}
              </div>
              <div className="kpi-label">Net Profit (₹)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{summary.newMembers}</div>
              <div className="kpi-label">New Members Joined</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{summary.activeMemberships}</div>
              <div className="kpi-label">Active Memberships</div>
            </div>
          </div>

          {/* Bar Chart */}
          {chartData.length > 0 && (
            <div className="dash-card mt-4">
              <h3>Collections by Payment Channel</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292d29" />
                  <XAxis dataKey="name" tick={{ fill: '#9b9f9a', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: '#9b9f9a', fontSize: 10 }}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#111412', border: '1px solid #292d29', fontSize: 12 }}
                    formatter={(v: any) => [`₹${Number(v || 0).toLocaleString('en-IN')}`] as any}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Amount (₹)" fill="#b5f23d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Transactions Preview Table */}
          <div className="table-card mt-4">
            <div className="card-header">
              <h3>Payment Transactions in Selected Range ({payments.length})</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-td">
                        No payments found in this date range.
                      </td>
                    </tr>
                  ) : (
                    payments.slice(0, 100).map((p) => (
                      <tr key={p._id}>
                        <td>
                          <code>{p.receiptNumber || `RCP-${p._id.slice(-6).toUpperCase()}`}</code>
                        </td>
                        <td>
                          <strong>{p.member?.name || 'Walk-in'}</strong>
                          {p.member?.phone && <br />}
                          {p.member?.phone && <small className="muted">{p.member.phone}</small>}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--green)' }}>{money(p.amountPaise)}</strong>
                        </td>
                        <td>
                          <span className="pill">{p.method.toUpperCase()}</span>
                        </td>
                        <td>{p.paidAt ? fmt(p.paidAt) : '—'}</td>
                        <td className="muted">{p.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
