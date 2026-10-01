import { useState } from 'react';
import { CartItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';

interface HeaderProps {
  cartItems: CartItem[];
  onCartClick: () => void;
  onLogoClick: () => void;
  onWishlistClick: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
  onContactClick: () => void;
  onAdminClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function Header({
  cartItems,
  onCartClick,
  onLogoClick,
  onWishlistClick,
  onLoginClick,
  onRegisterClick,
  onLogout,
  onContactClick,
  onAdminClick,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  const { user } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  // 👈 Laravel returns `is_admin`, not `role`
  const isAdmin = user?.is_admin === true;

  // 👈 Laravel returns a single `name` field
  const displayName = user?.name ?? '';
  const initial = displayName
    ? displayName[0].toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-50 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo */}
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 group flex-shrink-0"
          >
            <span className="text-2xl sm:text-3xl font-light tracking-[0.2em] text-stone-800 group-hover:text-amber-800 transition-colors">
              ATELIER
            </span>
            <span className="hidden sm:inline text-xs tracking-[0.3em] text-stone-500 uppercase mt-1">
              Luxe
            </span>
          </button>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-6">
            <button
              onClick={onLogoClick}
              className="text-sm tracking-wider text-stone-600 hover:text-amber-800 transition-colors uppercase"
            >
              Shop
            </button>
            <button
              onClick={onContactClick}
              className="text-sm tracking-wider text-stone-600 hover:text-amber-800 transition-colors uppercase"
            >
              Contact
            </button>
            {isAdmin && (
              <button
                onClick={onAdminClick}
                className="text-sm tracking-wider text-amber-800 hover:text-amber-900 transition-colors uppercase font-medium"
              >
                Admin
              </button>
            )}
          </nav>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 max-w-md mx-auto relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-full text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
            />
          </div>

          {/* Right-side icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearch((v) => !v)}
              className="md:hidden p-2 text-stone-700 hover:text-amber-800"
              aria-label="Search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenu((v) => !v)}
              className="lg:hidden p-2 text-stone-700 hover:text-amber-800"
              aria-label="Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Wishlist */}
            <button
              onClick={onWishlistClick}
              className="relative p-2 text-stone-700 hover:text-amber-800 transition-colors"
              aria-label="Wishlist"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {wishlistItems.length > 0 && (
               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {wishlistItems.length}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative p-2 text-stone-700 hover:text-amber-800 transition-colors"
              aria-label="Shopping cart"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {totalItems}
                </span>
              )}
            </button>

            {/* User menu */}
            {user ? (
              <div className="relative group">
                <button
                  className="flex items-center gap-2 p-2 text-stone-700 hover:text-amber-800 transition-colors"
                  aria-label="Account menu"
                >
                  <span className="w-8 h-8 rounded-full bg-amber-800 text-white text-sm flex items-center justify-center font-medium">
                    {initial}
                  </span>
                </button>
                <div className="absolute right-0 mt-1 w-56 bg-white border border-stone-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      {/* 👈 Single `name` field */}
                      <p className="text-sm text-stone-800 font-medium truncate">
                        {displayName || user.email}
                      </p>
                      {isAdmin && (
                        <span className="text-[10px] tracking-wider uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 truncate">{user.email}</p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={onAdminClick}
                      className="w-full text-left px-4 py-2.5 text-sm text-amber-800 hover:bg-amber-50 transition-colors"
                    >
                      Admin Dashboard
                    </button>
                  )}

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-amber-800 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="hidden sm:inline text-sm tracking-wider text-stone-600 hover:text-amber-800 transition-colors uppercase px-3 py-2"
                >
                  Sign In
                </button>
                <button
                  onClick={onRegisterClick}
                  className="hidden sm:inline text-sm tracking-wider bg-stone-800 text-white hover:bg-amber-900 transition-colors uppercase px-4 py-2 rounded"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile search input */}
        {mobileSearch && (
          <div className="md:hidden pb-4 relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 absolute left-3 top-3 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
            />
          </div>
        )}

        {/* Mobile menu dropdown */}
        {mobileMenu && (
          <nav className="lg:hidden pb-4 border-t border-stone-200 pt-3 space-y-1">
            <button
              onClick={() => {
                onLogoClick();
                setMobileMenu(false);
              }}
              className="block w-full text-left px-2 py-2 text-sm tracking-wider text-stone-700 hover:text-amber-800 uppercase"
            >
              Shop
            </button>
            <button
              onClick={() => {
                onWishlistClick();
                setMobileMenu(false);
              }}
              className="block w-full text-left px-2 py-2 text-sm tracking-wider text-stone-700 hover:text-amber-800 uppercase"
            >
              Wishlist
            </button>
            <button
              onClick={() => {
                onContactClick();
                setMobileMenu(false);
              }}
              className="block w-full text-left px-2 py-2 text-sm tracking-wider text-stone-700 hover:text-amber-800 uppercase"
            >
              Contact
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  onAdminClick();
                  setMobileMenu(false);
                }}
                className="block w-full text-left px-2 py-2 text-sm tracking-wider text-amber-800 hover:text-amber-900 uppercase font-medium"
              >
                Admin
              </button>
            )}

            {!user && (
              <div className="pt-2 flex gap-3 px-2">
                <button
                  onClick={() => {
                    onLoginClick();
                    setMobileMenu(false);
                  }}
                  className="text-sm tracking-wider text-stone-600 hover:text-amber-800 uppercase"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onRegisterClick();
                    setMobileMenu(false);
                  }}
                  className="text-sm tracking-wider bg-stone-800 text-white hover:bg-amber-900 uppercase px-4 py-2 rounded"
                >
                  Register
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}