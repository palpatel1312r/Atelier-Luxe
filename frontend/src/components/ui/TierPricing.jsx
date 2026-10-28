/** Render real quantity slabs from the product API, not placeholder tiers. */
export default function TierPricing({ slabs = [], quantity = 1, onQuantityChange }) {
  if (!slabs.length) return null;
  const ordered = [...slabs].sort((a,b) => Number(a.min_qty) - Number(b.min_qty));
  return <section className="enterprise-tiers" aria-label="Volume discount pricing">
    <div className="enterprise-tiers__heading"><div><small>VOLUME PRICING</small><h3>Better rates at scale</h3></div><span>Quantity tiers</span></div>
    <div className="enterprise-tiers__list" role="group" aria-label="Select an order quantity tier">
      {ordered.map((s,i) => {
        const active = Number(quantity) >= Number(s.min_qty) && (!s.max_qty || Number(quantity) <= Number(s.max_qty));
        return <button type="button" key={`${s.min_qty}-${i}`} className={active ? "enterprise-tier is-active" : "enterprise-tier"} aria-pressed={active} onClick={() => onQuantityChange(Math.max(1,Number(s.min_qty)))}>
          <span>{s.min_qty}{s.max_qty ? `–${s.max_qty}` : "+"} <small>units</small></span>
          <strong>₹{Number(s.price).toLocaleString("en-IN")}</strong>
          {active && <em>Current tier</em>}
        </button>;
      })}
    </div>
    <p>Final price is calculated by your account’s pricing rules when quantity changes.</p>
  </section>;
}
