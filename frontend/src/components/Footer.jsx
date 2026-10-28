import { Link } from "react-router-dom";
import Icon from "./ui/Icon";
import "../styles/footer.css";

/** Compact footer: the mobile navigation is handled once, in MobileDock. */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="trade-v12-footer" aria-label="Site footer">
      <div className="trade-v12-footer__primary">
        <Link to="/dashboard" className="trade-v12-footer__brand" aria-label="Wholesale home">
          <span className="trade-v12-footer__symbol">W<span>.</span></span>
          <span><strong>Wholesale</strong><small>THE BUSINESS BUYING NETWORK</small></span>
        </Link>
        <p>Better sourcing. Faster decisions. Trade on your terms.</p>
        <Link className="trade-v12-footer__action" to="/fast-order">Open quick order <Icon name="arrow" size={16}/></Link>
      </div>
      <div className="trade-v12-footer__bottom">
        <span>© {year} Wholesale. Made for business.</span>
        <nav aria-label="Footer navigation">
          <Link to="/products">Catalog</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/contact">Support</Link>
          <Link to="/terms">Terms</Link>
        </nav>
        <span className="trade-v12-footer__secure"><Icon name="shield" size={14}/> Secure buyer experience</span>
      </div>
    </footer>
  );
}
