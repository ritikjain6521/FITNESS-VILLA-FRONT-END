import { useEffect, useState } from 'react';
import { api, money, fmt, daysLeft } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, CreditCard, CalendarCheck, TrendingUp, AlertTriangle, Bell, UserPlus, DollarSign } from 'lucide-react';

type KPIs = {
  totalMembers: number; activeMembers: number; activeMemberships: number;
  expiredMemberships: number; todayAttendance: number; todayCollectionsPaise: number;
  monthCollectionsPaise: number; upcomingExpiry: number; newThisMonth: number; pendingEnquiries: number;
};

type ChartPoint = { month: string; revenue: number; expenses: number };
type Member = { _id: string; name: string; email: string; phone?: string; createdAt: string };
type Expiry = { _id: string; member: { name: string; email: string; phone?: string }; plan: { name: string }; endDate: string };

function KPICard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent?: boolean }) {
  return (
    <div className={`kpi-card ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-icon"><Icon size={22} /></div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [expiring, setExpiring] = useState<Expiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api<{ items: ChartPoint[] }>('/dashboard/revenue-chart'),
      api<KPIs>('/dashboard/kpis'),
      api<{ items: Member[] }>('/dashboard/recent-members'),
      api<{ items: Expiry[] }>('/dashboard/upcoming-expiry'),
    ]).then(([c, k, m, e]) => {
      setChart(c.items); setKpis(k); setRecentMembers(m.items); setExpiring(e.items);
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner"/><span>Loading dashboard…</span></div>;
  if (error) return <div className="page-error"><AlertTriangle size={24}/><span>{error}</span></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Today's overview — {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-green" onClick={() => navigate('/dashboard/members/new')}>
            <UserPlus size={16}/> Add Member
          </button>
        </div>
      </div>

      {kpis && (
        <div className="kpi-grid">
          <KPICard label="Total Members" value={kpis.totalMembers} icon={Users} />
          <KPICard label="Active Memberships" value={kpis.activeMemberships} icon={CreditCard} accent />
          <KPICard label="Today's Attendance" value={kpis.todayAttendance} icon={CalendarCheck} />
          <KPICard label="Today's Collections" value={money(kpis.todayCollectionsPaise)} icon={DollarSign} accent />
          <KPICard label="Month Collections" value={money(kpis.monthCollectionsPaise)} icon={TrendingUp} />
          <KPICard label="Expired Memberships" value={kpis.expiredMemberships} icon={AlertTriangle} />
          <KPICard label="Expiring in 7 Days" value={kpis.upcomingExpiry} icon={Bell} />
          <KPICard label="New This Month" value={kpis.newThisMonth} icon={UserPlus} />
        </div>
      )}

      <div className="dash-grid-2">
        {/* Revenue chart */}
        <div className="dash-card">
          <h3>Revenue vs Expenses (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chart} margin={{ top:10, right:10, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b5f23d" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#b5f23d" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#292d29"/>
              <XAxis dataKey="month" tick={{ fill:'#9b9f9a', fontSize:11 }} />
              <YAxis tick={{ fill:'#9b9f9a', fontSize:10 }} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}/>
              <Tooltip
                contentStyle={{ background:'#111412', border:'1px solid #292d29', borderRadius:4, fontSize:12 }}
                formatter={(v: any) => [`₹${Number(v || 0).toLocaleString('en-IN')}`, ''] as any}
              />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#b5f23d" fill="url(#rev)" strokeWidth={2}/>
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ff6b6b" fill="url(#exp)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming expiry */}
        <div className="dash-card">
          <h3>Memberships Expiring Soon</h3>
          {expiring.length === 0 ? (
            <p className="empty-state">No memberships expiring in the next 14 days.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Member</th><th>Plan</th><th>Expires</th><th>Days</th></tr></thead>
                <tbody>
                  {expiring.map(e => {
                    const dl = daysLeft(e.endDate);
                    return (
                      <tr key={e._id}>
                        <td><div>{e.member.name}</div><small className="muted">{e.member.phone}</small></td>
                        <td>{e.plan.name}</td>
                        <td>{fmt(e.endDate)}</td>
                        <td><span className={`badge ${dl <= 0 ? 'badge-red' : dl <= 3 ? 'badge-orange' : 'badge-yellow'}`}>{dl <= 0 ? 'Expired' : `${dl}d`}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent members */}
      <div className="dash-card mt-4">
        <div className="card-header">
          <h3>Recent Registrations</h3>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/dashboard/members')}>View all</button>
        </div>
        {recentMembers.length === 0 ? (
          <p className="empty-state">No members yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead>
              <tbody>
                {recentMembers.map(m => (
                  <tr key={m._id} className="clickable" onClick={() => navigate(`/dashboard/members/${m._id}`)}>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.phone || '—'}</td>
                    <td>{fmt(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
