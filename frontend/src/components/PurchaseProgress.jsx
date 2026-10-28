import { Link } from "react-router-dom";
import Icon from "./ui/Icon";

/** A purely visual purchase indicator. Does not change cart or payment state. */
export default function PurchaseProgress({ stage = "cart" }) {
  const checkout = stage === "checkout";
  return <nav className="arc-purchase-progress" aria-label="Purchase steps">
    <Link to="/cart" aria-current={!checkout ? "step" : undefined} className={`arc-purchase-progress__item ${checkout ? "is-done" : "is-current"}`}><span>{checkout ? <Icon name="check" size={15}/> : "01"}</span> Review basket</Link>
    <i aria-hidden="true"/>
    <span aria-current={checkout ? "step" : undefined} className={`arc-purchase-progress__item ${checkout ? "is-current" : ""}`}><span>02</span> Secure checkout</span>
    <i aria-hidden="true"/>
    <span className="arc-purchase-progress__item"><span>03</span> Order confirmed</span>
  </nav>;
}
