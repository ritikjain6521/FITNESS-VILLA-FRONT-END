import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, CalendarCheck, Check, ChevronRight, Dumbbell, Instagram, Menu, ShieldCheck, Users, Wallet, X, Sparkles, Flame } from 'lucide-react';
import { api, money } from '../api';
import { useAuth } from '../hooks/useAuth';

type Plan = { _id: string; name: string; description: string; pricePaise: number; durationDays: number; features: string[] };

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [menu, setMenu] = useState(false);
  const [enquiry, setEnquiry] = useState({ name: '', email: '', phone: '', message: '', interest: 'membership', consentGiven: false });
  const [sending, setSending] = useState(false);
  const [enquiryMsg, setEnquiryMsg] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api<{ items: Plan[] }>('/plans').then(r => setPlans(r.items)).catch(() => setPlans([]));
  }, []);

  async function submitEnquiry(e: React.FormEvent) {
    e.preventDefault(); setSending(true); setEnquiryMsg('');
    try {
      await api('/enquiries/public', { method: 'POST', body: JSON.stringify(enquiry) });
      setEnquiryMsg('✅ Enquiry received! Welcome to Fitness Villa. Our team will contact you shortly.');
      setEnquiry({ name: '', email: '', phone: '', message: '', interest: 'membership', consentGiven: false });
    } catch(err) {
      setEnquiryMsg(err instanceof Error ? `❌ ${err.message}` : '❌ Submission failed');
    } finally { setSending(false); }
  }

  return (
    <div className="app-shell">
      {/* Background ambient glowing auras */}
      <div className="ambient-glow glow-1"/>
      <div className="ambient-glow glow-2"/>

      <header className="nav wrap">
        <a className="brand" href="/">
          <span className="brand-mark pulse-box"><Activity size={23}/></span>
          <span>FITNESS <span className="accent">VILLA</span><small>LUXURY &amp; PERFORMANCE</small></span>
        </a>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Toggle menu">{menu ? <X/> : <Menu/>}</button>
        <nav className={menu ? 'nav-links open' : 'nav-links'}>
          <a href="#programs" onClick={() => setMenu(false)}>Programs</a>
          <a href="#membership" onClick={() => setMenu(false)}>Membership</a>
          <a href="#facility" onClick={() => setMenu(false)}>The Villa Facility</a>
          <a href="#contact" onClick={() => setMenu(false)}>Contact &amp; Visit</a>
        </nav>
        <button className="btn btn-outline nav-cta hover-glow" onClick={() => user ? navigate('/dashboard') : navigate('/login')}>
          {user ? 'Dashboard' : 'Member Login'} <ArrowUpRight size={16}/>
        </button>
      </header>

      <main>
        {/* Hero */}
        <section className="hero wrap animate-fade-in">
          <div className="hero-copy">
            <div className="eyebrow"><span className="pulse-dot"/> THE ULTIMATE TRAINING SANCTUARY</div>
            <h1>YOUR WORK.<br/>YOUR <span className="accent animated-gradient-text">STRENGTH.</span><br/>YOUR VILLA.</h1>
            <p className="hero-desc">Welcome to Fitness Villa — where world-class equipment meets luxurious wellness. Elevate your body, master your mindset, and achieve your peak physique.</p>
            <div className="hero-actions">
              <a className="btn btn-green shimmer-btn" href="#membership">Explore Memberships <ChevronRight size={18}/></a>
              <a className="text-link" href="#programs"><span className="play pulse-subtle">↗</span> Discover Training Zones</a>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars"><span className="avatar-fv">FV</span><span>VIP</span><span>PRO</span></div>
              <div><strong>ELITE ATHLETES &amp; COMMUNITY</strong><small>Over 500+ active members building their legacy daily.</small></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image zoom-hover"/>
            <div className="image-shade"/>
            <div className="image-caption">
              <span>01 / FITNESS VILLA EXPERIENCE</span>
              <strong>NO SHORTCUTS.<br/>JUST LUXURY &amp; POWER.</strong>
            </div>
            <div className="vertical-label">FITNESS VILLA · ELITE PERFORMANCE</div>
            <div className="floating-stat float-anim glow-border">
              <Flame size={22} className="accent"/>
              <div><strong>100%</strong><small>DEDICATION</small></div>
            </div>
          </div>
          <div className="hero-index">01 — FORGED IN STEEL · DEFINED BY EXCELLENCE</div>
        </section>

        {/* Infinite Scrolling Animated Ticker */}
        <section className="ticker">
          <div className="ticker-track">
            <span>FITNESS VILLA</span> ✳ STRENGTH &amp; POWER ✳ <span>HYPERTROPHY</span> ✳ RECOVERY &amp; STEAM ✳ <span>OLYMPIC LIFTING</span> ✳ CARDIO SANCTUARY ✳ <span>LUXURY WELLNESS</span> ✳ FITNESS VILLA ✳ STRENGTH &amp; POWER ✳ <span>HYPERTROPHY</span> ✳ RECOVERY &amp; STEAM ✳ <span>OLYMPIC LIFTING</span> ✳ CARDIO SANCTUARY ✳ <span>LUXURY WELLNESS</span>
          </div>
        </section>

        {/* Programs */}
        <section className="section wrap" id="programs">
          <div className="section-head">
            <div>
              <div className="eyebrow"><Sparkles size={14}/> WORLD-CLASS DISCIPLINES</div>
              <h2>FIND YOUR <span className="accent">EDGE.</span></h2>
            </div>
            <p>Every training zone at Fitness Villa is engineered for maximum muscle activation, safety, and athletic progression.</p>
          </div>
          <div className="program-grid">
            <article className="program-card program-one hover-lift">
              <div className="program-number">01 / STRENGTH ZONE</div>
              <div>
                <Dumbbell size={28} className="program-icon"/>
                <h3>Heavy Iron &amp; Power</h3>
                <p>Custom calibrated barbell racks, Olympic bumper plates, and biomechanical selectorized machines.</p>
              </div>
            </article>
            <article className="program-card program-two hover-lift">
              <div className="program-number">02 / 1-ON-1 COACHING</div>
              <div>
                <Users size={28} className="program-icon"/>
                <h3>Personal Coaching</h3>
                <p>Master trainers delivering tailored biomechanical analysis, nutrition programming, and accountability.</p>
              </div>
            </article>
            <article className="program-card program-three hover-lift">
              <div className="program-number">03 / FUNCTIONAL &amp; CARDIO</div>
              <div>
                <Activity size={28} className="program-icon"/>
                <h3>High Performance</h3>
                <p>HIIT tracks, assault bikes, turf sled runs, and cardio theatre for unstoppable stamina and endurance.</p>
              </div>
            </article>
          </div>
        </section>

        {/* Facility */}
        <section className="facility" id="facility">
          <div className="facility-inner wrap">
            <div className="animate-fade-in">
              <div className="eyebrow">A NEW STANDARD IN FITNESS</div>
              <h2>THE VILLA<br/><span className="accent">SANCTUARY.</span></h2>
              <p>Step into an architecturally stunning space designed to inspire greatness. Featuring air-purified training floors, private steam chambers, luxury locker suites, and an in-house supplement bar.</p>
              <a className="btn btn-green shimmer-btn" href="#contact">Book Private Club Tour <ArrowUpRight size={17}/></a>
            </div>
            <div className="facility-image hover-lift">
              <div className="facility-stamp float-subtle">
                FITNESS<br/>VILLA<br/><span>ELITE</span><br/>EST. 2024
              </div>
            </div>
          </div>
        </section>

        {/* Membership plans */}
        <section className="section wrap" id="membership">
          <div className="section-head">
            <div>
              <div className="eyebrow">TRANSPARENT &amp; ALL-INCLUSIVE</div>
              <h2>MEMBERSHIP <span className="accent">TIERS.</span></h2>
            </div>
            <p>Choose the tier tailored to your ambitions. All memberships include club amenities and towel service.</p>
          </div>
          <div className="pricing-grid">
            {plans.length ? plans.map((p, i) => (
              <article className={`price-card hover-lift ${i === 1 ? 'featured glow-featured' : ''}`} key={p._id}>
                {i === 1 && <div className="popular pulse-badge">MOST POPULAR</div>}
                <div className="price-label">{p.durationDays} DAYS VIP ACCESS</div>
                <h3>{p.name}</h3>
                <div className="price">{money(p.pricePaise)}<span>/ plan</span></div>
                <p className="muted">{p.description || 'Access to the Fitness Villa luxury fitness experience.'}</p>
                <ul>
                  {(p.features || []).map(f => (
                    <li key={f}><Check size={16} className="check-icon"/>{f}</li>
                  ))}
                </ul>
                <button
                  className={i === 1 ? 'btn btn-green full shimmer-btn' : 'btn btn-outline full hover-glow'}
                  onClick={() => navigate('/login')}
                >
                  Join Fitness Villa <ChevronRight size={17}/>
                </button>
              </article>
            )) : (
              <article className="price-card">
                <div className="price-label">MEMBERSHIPS</div>
                <h3>Find your plan</h3>
                <p className="muted">Membership options will appear here once plans are added by the administrator.</p>
                <button className="btn btn-green full" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Ask about membership</button>
              </article>
            )}
          </div>
        </section>

        {/* CTA band */}
        <section className="join-band">
          <div className="wrap join-inner">
            <div>
              <div className="eyebrow"><Sparkles size={14}/> TRANSFORM YOUR LIFE</div>
              <h2>READY TO ENTER<br/>FITNESS <span className="accent">VILLA?</span></h2>
            </div>
            <a href="#contact" className="btn btn-green shimmer-btn">Experience The Villa <ArrowUpRight size={18}/></a>
          </div>
        </section>

        {/* Contact / Enquiry */}
        <section className="section wrap contact-section" id="contact">
          <div>
            <div className="eyebrow">CONNECT WITH OUR CONCIERGE</div>
            <h2>START YOUR<br/><span className="accent">JOURNEY TODAY.</span></h2>
            <p className="muted">Book a complimentary consultation, trial workout, or inquire about personalized training packages at Fitness Villa.</p>
          </div>
          <div className="contact-box glass-card hover-lift">
            <div className="contact-item">
              <ShieldCheck className="accent"/>
              <span>
                <strong>Certified Elite Trainers</strong>
                <small>Every session is scientifically backed and tailored to your biomechanics.</small>
              </span>
            </div>
            <div className="contact-item">
              <CalendarCheck className="accent"/>
              <span>
                <strong>Flexible Training Schedules</strong>
                <small>Open 6:00 AM – 10:30 PM with valet parking and luxury changing suites.</small>
              </span>
            </div>

            {/* Enquiry form */}
            <form onSubmit={submitEnquiry} className="enquiry-form">
              <label>Your Name *
                <input required minLength={2} maxLength={100} value={enquiry.name} onChange={e => setEnquiry(f=>({...f,name:e.target.value}))} placeholder="e.g. Aryan Kapoor"/>
              </label>
              <label>Email Address
                <input type="email" maxLength={254} value={enquiry.email} onChange={e => setEnquiry(f=>({...f,email:e.target.value}))} placeholder="aryan@example.com"/>
              </label>
              <label>Phone Number *
                <input required maxLength={25} value={enquiry.phone} onChange={e => setEnquiry(f=>({...f,phone:e.target.value}))} placeholder="+91 98765 43210"/>
              </label>
              <label>Interest
                <select value={enquiry.interest} onChange={e => setEnquiry(f=>({...f,interest:e.target.value}))}>
                  <option value="membership">Club Membership</option>
                  <option value="personal_training">1-on-1 Personal Training</option>
                  <option value="free_trial">Complimentary Trial Session</option>
                  <option value="other">General Inquiry / Tour</option>
                </select>
              </label>
              <label className="full-width">Your Message *
                <textarea required minLength={5} maxLength={1000} rows={3} value={enquiry.message} onChange={e => setEnquiry(f=>({...f,message:e.target.value}))} placeholder="Tell us about your fitness targets, schedule preference, or questions…"/>
              </label>
              <label className="consent-label">
                <input type="checkbox" required checked={enquiry.consentGiven} onChange={e => setEnquiry(f=>({...f,consentGiven:e.target.checked}))}/>
                <span>I consent to Fitness Villa concierge contacting me regarding my inquiry. Privacy is 100% guaranteed.</span>
              </label>
              {enquiryMsg && <p className={enquiryMsg.startsWith('✅') ? 'success-msg' : 'error-msg'}>{enquiryMsg}</p>}
              <button type="submit" className="btn btn-green full shimmer-btn" disabled={sending}>
                {sending ? 'Transmitting…' : <><ArrowUpRight size={17}/> Send Inquiry to Fitness Villa</>}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <a className="brand" href="/">
            <span className="brand-mark"><Activity size={22}/></span>
            <span>FITNESS <span className="accent">VILLA</span><small>LUXURY &amp; PERFORMANCE</small></span>
          </a>
          <span>DISCIPLINE BUILDS MOMENTUM · LUXURY MEETS STRENGTH</span>
          <span className="social"><Instagram size={17}/> @FITNESSVILLA_OFFICIAL</span>
        </div>
        <div className="wrap copyright">© {new Date().getFullYear()} Fitness Villa Luxury Fitness Club. All rights reserved.</div>
      </footer>
    </div>
  );
}
