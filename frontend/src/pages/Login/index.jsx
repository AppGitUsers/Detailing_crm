import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, LogIn } from 'lucide-react';
import Button from '../../components/Button';
import { Field, Input } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { login } from '../../api/auth';
import { extractError } from '../../api/axios';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    <div className="min-h-screen w-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Sparkles size={22} className="text-accent" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-100 leading-tight">Detailing CRM</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Workshop</div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-bg-card border border-border rounded-xl p-6 shadow-2xl"
        >
          <h1 className="text-xl font-semibold text-gray-100 mb-1">Sign in</h1>
          <p className="text-sm text-gray-400 mb-6">Enter your credentials to continue.</p>

          <div className="space-y-4">
            <Field label="Username" required>
              <Input
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>

          <Button
            type="submit"
            className="w-full mt-6"
            loading={submitting}
            disabled={!username || !password}
          >
            <LogIn size={16} /> Sign In
          </Button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Don't have an account? Create a Django superuser:<br />
            <code className="text-gray-400">python manage.py createsuperuser</code>
          </p>
        </form>
      </div>
    </div>
  );
}
