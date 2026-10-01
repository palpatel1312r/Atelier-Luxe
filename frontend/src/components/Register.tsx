import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface RegisterProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  onBack: () => void;
}

export default function Register({ onSuccess, onGoToLogin, onBack }: RegisterProps) {
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await register({
        name: `${firstName} ${lastName}`.trim(),
        email,
        password,
        password_confirmation: confirm,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800';

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-600 hover:text-amber-800 transition-colors mb-8 group"
      >
        <span className="text-sm tracking-wider uppercase">← Back</span>
      </button>

      <h1 className="text-3xl font-light text-stone-800 mb-2">Create Account</h1>
      <p className="text-stone-500 mb-8">Join Atelier Luxe for a personalized experience.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            required
            minLength={6}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-stone-800 text-white py-3.5 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors disabled:bg-stone-400"
        >
          {submitting ? 'Creating…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-stone-600 mt-6">
        Already have an account?{' '}
        <button onClick={onGoToLogin} className="text-amber-800 hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );
}