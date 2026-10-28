import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSent(true);
      toast.success('If that email exists, a reset link was sent.');
    } catch (err: any) {
      toast.error(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-light text-stone-800 mb-2">Reset password</h1>
      <p className="text-sm text-stone-500 mb-8">
        Enter your email and we&apos;ll send a reset token (logged on the server in demo mode).
      </p>
      {sent ? (
        <div className="text-sm text-stone-600 space-y-4">
          <p>Check your inbox (or the API server console).</p>
          <Link to="/login" className="text-amber-900 underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full border border-stone-200 rounded-md px-4 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-800 text-white py-3.5 text-sm tracking-wider uppercase hover:bg-amber-900 disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <Link to="/login" className="block text-center text-sm text-stone-500 hover:text-amber-900">
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
