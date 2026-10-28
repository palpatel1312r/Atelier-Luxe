import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Icon from './ui/Icon';
import MobileDock from './ui/MobileDock';
import ScrollProgress from './ui/ScrollProgress';
import ProductSearch from './ProductSearch';
import BackToTop from './ui/BackToTop';
import '../styles/layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(location.search).get('q') || ''
  );

  useEffect(() => {
    setSearchQuery(new URLSearchParams(location.search).get('q') || '');
  }, [location.pathname, location.search]);

  const searchProducts = (term) => {
    setSearchQuery(term);
    navigate(`/products?q=${encodeURIComponent(term)}`);
  };

  const breadcrumb = location.pathname.startsWith('/products') ? 'Marketplace' :
    location.pathname === '/fast-order' ? 'Fast order' :
    location.pathname.startsWith('/orders') ? 'Orders' :
    location.pathname === '/cart' ? 'Basket' :
    location.pathname === '/checkout' ? 'Checkout' :
    location.pathname === '/wishlist' ? 'Saved products' :
    location.pathname === '/profile' ? 'Business profile' : 'Overview';

  return (
    <div className="app-layout studio-site studio-site--no-sidebar trade-v12">
      <a className="arc-skip-link" href="#main-content">Skip to content</a>
      <ScrollProgress />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} onProductSearch={searchProducts} />
      <div className="studio-site__shell trade-v12__shell">
        <div className="studio-site__column">
          <div className="studio-site__subhead">
            <div className="studio-site__path">
              {/* <span className="trade-v12__eyebrow">WORKSPACE <Icon name="chevron" size={12} /></span> */}
              <Link to="/dashboard">B2B Wholesale</Link>
              <Icon name="chevron" size={13} />
              <strong>{breadcrumb}</strong>
            </div>
            <div className="enterprise-global-tools">
              <span className="enterprise-currency">INR · ₹</span>
              <ProductSearch
                variant="subhead"
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={searchProducts}
              />
              <Link to="/fast-order" className="enterprise-header-cta">
                <Icon name="plus" size={15} /> Fast order
              </Link>
            </div>
          </div>
          <main
            id="main-content"
            key={location.pathname}
            className="app-layout__content studio-site__main studio-enter"
          >
            {children}
          </main>
          <div className="studio-site__assurance" aria-label="Wholesale platform capabilities">
            <span><Icon name="shield" size={17} /> Secure trade workspace</span>
            <span><Icon name="tag" size={17} /> Account-specific prices</span>
            <span><Icon name="orders" size={17} /> Streamlined replenishment</span>
          </div>
          <Footer />
        </div>
      </div>
      <MobileDock />
      <BackToTop />
    </div>
  );
}
