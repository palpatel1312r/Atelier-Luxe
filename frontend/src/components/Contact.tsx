import { useState } from 'react';

import { api } from '../lib/api';

interface ContactProps {
  onBack: () => void;
}

export default function Contact({ onBack }: ContactProps) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
  await api.contact(form);
      setSuccess(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-600 hover:text-amber-800 transition-colors mb-8 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm tracking-wider uppercase">Back</span>
      </button>

      <p className="text-xs tracking-[0.3em] text-amber-800 uppercase mb-3">Contact</p>
      <h1 className="text-3xl sm:text-4xl font-light text-stone-800 mb-4 tracking-wide">
        Get in Touch
      </h1>
      <p className="text-stone-500 mb-10 max-w-xl leading-relaxed">
        Questions about an order, sizing, or a special request? We'd love to hear from you.
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6">
          Thank you — your message has been sent. We'll get back to you soon.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-lg border border-stone-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Subject</label>
          <input
            value={form.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Message *</label>
          <textarea
            value={form.message}
            onChange={(e) => handleChange('message', e.target.value)}
            rows={6}
            className={inputClass}
            required
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-stone-800 text-white py-3.5 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors disabled:bg-stone-400"
        >
          {submitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}