import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto py-24 text-center px-4">
      <p className="text-6xl font-light text-stone-300 mb-4">404</p>
      <h1 className="text-2xl text-stone-800 mb-3">Page not found</h1>
      <p className="text-stone-500 mb-8">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="inline-block bg-stone-800 text-white px-8 py-3.5 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
      >
        Back to shop
      </Link>
    </div>
  );
}
