import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../components/Button';
import { Field, Input } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { login } from '../../api/auth';
import { extractError } from '../../api/axios';

const BG_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=80',
    label: 'Premium Detailing',
  },
  {
    url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1920&q=80',
    label: 'Perfect Finish',
  },
  {
    url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80',
    label: 'Luxury Care',
  },
  {
    url: 'https://images.unsplash.com/photo-1545208782-00ac70e6ee78?auto=format&fit=crop&w=1920&q=80',
    label: 'Expert Hands',
  },
];

const SLIDE_DURATION = 6000;
const FADE_DURATION = 700;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Background slideshow state
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const goTo = (idx) => {
    if (transitioning) return;
    setNext(idx);
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setNext(null);
      setTransitioning(false);
    }, FADE_DURATION);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % BG_IMAGES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, transitioning]);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      await login(username, password);
      toast.success('Welcome back!');
      const redirectTo = location.state?.from || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center relative overflow-hidden">

      {/* ── Background images ── */}
      {BG_IMAGES.map((img, i) => (
        <div
          key={img.url}
          className="absolute inset-0 bg-cover bg-center transition-opacity"
          style={{
            backgroundImage: `url(${img.url})`,
            opacity: i === current ? (transitioning ? 0 : 1) : i === next ? (transitioning ? 1 : 0) : 0,
            transitionDuration: `${FADE_DURATION}ms`,
            zIndex: i === next ? 1 : 0,
          }}
        />
      ))}

      {/* ── Dark gradient overlay ── */}
      <div className="absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(135deg, rgba(11,13,18,0.92) 0%, rgba(11,13,18,0.70) 50%, rgba(11,13,18,0.85) 100%)',
        }}
      />

      {/* ── Accent colour vignette ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 70%, rgba(124,92,255,0.12) 0%, transparent 60%)',
        }}
      />

      {/* ── Slide indicators ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {BG_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'w-6 h-2 bg-accent'
                : 'w-2 h-2 bg-white/30 hover:bg-white/60'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* ── Slide label (bottom-left) ── */}
      <div className="absolute bottom-6 left-6 z-20 hidden sm:block">
        <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium">
          {BG_IMAGES[current].label}
        </p>
      </div>

      {/* ── Slide arrow controls ── */}
      <button
        onClick={() => goTo((current - 1 + BG_IMAGES.length) % BG_IMAGES.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-white/50 hover:bg-black/50 hover:text-white transition hidden md:flex"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => goTo((current + 1) % BG_IMAGES.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-white/50 hover:bg-black/50 hover:text-white transition hidden md:flex"
      >
        <ChevronRight size={18} />
      </button>

      {/* ── Login card ── */}
      <div className="relative z-20 w-full max-w-[420px] px-4">

        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'rgba(124,92,255,0.20)', border: '1px solid rgba(124,92,255,0.35)' }}
          >
            <Sparkles size={22} className="text-accent" />
          </div>
          <div>
            <div className="text-xl font-bold text-white leading-tight tracking-tight">
              Detailing CRM
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
              Workshop Management
            </div>
          </div>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-7 shadow-2xl"
          style={{
            background: 'rgba(19,22,29,0.80)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Welcome back</h1>
          <p className="text-sm text-white/40 mb-7">Sign in to access your dashboard.</p>

          <form onSubmit={submit} className="space-y-5">
            <Field label="Username" required>
              <Input
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-accent"
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-accent"
              />
            </Field>

            <Button
              type="submit"
              className="w-full mt-2"
              loading={submitting}
              disabled={!username || !password}
            >
              <LogIn size={16} /> Sign In
            </Button>
          </form>

          <div
            className="mt-6 pt-5 border-t text-xs text-center text-white/25"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            No account?&nbsp;
            <code className="text-white/40 font-mono">python manage.py createsuperuser</code>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-center text-[11px] text-white/20 mt-5 tracking-wide">
          Premium automotive detailing management
        </p>
      </div>
    </div>
  );
}
