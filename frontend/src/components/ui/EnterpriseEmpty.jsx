import { Link } from "react-router-dom";
import Icon from "./Icon";
/** Consistent illustration, accessible heading and contextual next action. */
export default function EnterpriseEmpty({ title = "Nothing here yet", description = "Records will appear here when available.", to, action = "Browse products" }) {
  return <div className="enterprise-empty"><div className="enterprise-empty__art" aria-hidden="true"><svg viewBox="0 0 144 112" fill="none"><rect x="20" y="24" width="104" height="66" rx="12" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="2"/><path d="M20 44h104M43 24v66" stroke="#93C5FD" strokeWidth="2"/><rect x="55" y="54" width="54" height="8" rx="4" fill="#93C5FD"/><rect x="55" y="68" width="37" height="6" rx="3" fill="#BFDBFE"/><circle cx="116" cy="23" r="17" fill="#2563EB"/><path d="M116 15v16M108 23h16" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg></div><h3>{title}</h3><p>{description}</p>{to && <Link className="enterprise-empty__link" to={to}>{action}<Icon name="arrow" size={16}/></Link>}</div>;
}
