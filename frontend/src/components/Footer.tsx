import { Link } from 'react-router-dom';
import { APP_NAME } from '../lib/constants';

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 mt-16 sm:mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm text-stone-600">
        <div>
          <p className="text-stone-800 tracking-[0.2em] uppercase text-xs mb-3">{APP_NAME}</p>
          <p className="leading-relaxed">
            Considered garments for everyday life. Crafted with care, designed to last.
          </p>
        </div>
        <div>
          <p className="text-stone-800 tracking-wider uppercase text-xs mb-3">Shop</p>
          <ul className="space-y-2">
            <li><Link to="/" className="hover:text-amber-900">All products</Link></li>
            <li><Link to="/contact" className="hover:text-amber-900">Contact</Link></li>
            <li><Link to="/orders" className="hover:text-amber-900">My orders</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-stone-800 tracking-wider uppercase text-xs mb-3">Account</p>
          <ul className="space-y-2">
            <li><Link to="/login" className="hover:text-amber-900">Sign in</Link></li>
            <li><Link to="/register" className="hover:text-amber-900">Create account</Link></li>
            <li><Link to="/profile" className="hover:text-amber-900">Profile</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 py-4 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
