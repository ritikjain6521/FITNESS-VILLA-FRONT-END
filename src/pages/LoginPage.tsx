import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <button className="modal-close" onClick={() => navigate('/')}><X size={18}/></button>
        <div className="brand-mark"><Activity size={22}/></div>
        <div className="eyebrow">STAFF &amp; MEMBER ACCESS</div>
        <h2>WELCOME <span className="accent">BACK.</span></h2>
        <p className="muted">Sign in to your Fitness Villa account.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>Email address
            <input type="email" required autoComplete="username" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/>
          </label>
          <label>Password
            <input type="password" required minLength={8} autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"/>
          </label>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-green full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>
        <small className="muted">Accounts are created by gym administration. Public registration is disabled.</small>
      </div>
    </div>
  );
}
