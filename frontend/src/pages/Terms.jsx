import Layout from '../components/Layout';
import '../styles/static-page.css';

// Placeholder legal content — replace with your actual reviewed Terms &
// Conditions before going live. Structuring it as its own page (rather than
// a modal) means it can be linked to directly, e.g. from a WhatsApp message
// or printed invoice, which a modal can't do.
export default function Terms() {
  return (
    <Layout>
      <div className="static-page">
        <h1>Terms & Conditions</h1>
        <p className="static-page__notice">
          This is placeholder content. Replace with your reviewed Terms & Conditions before launch.
        </p>

        <section>
          <h2>1. Account & Eligibility</h2>
          <p>Access to this platform is limited to verified business dealers and their authorized representatives. Accounts are non-transferable.</p>
        </section>
        <section>
          <h2>2. Pricing & Orders</h2>
          <p>Prices shown are specific to your assigned dealer group and are subject to change without prior notice. Orders are confirmed only after admin approval.</p>
        </section>
        <section>
          <h2>3. Payments</h2>
          <p>Credit-term dealers must settle outstanding balances per their agreed credit terms. Online payments are processed via a third-party payment gateway.</p>
        </section>
        <section>
          <h2>4. Returns & Cancellations</h2>
          <p>Cancellation requests must be raised before an order is dispatched. Returns are subject to admin approval and product condition.</p>
        </section>
        <section>
          <h2>5. Data & Privacy</h2>
          <p>Your account and order data is used solely to operate this platform and is not shared with third parties beyond what's required for order fulfillment and payment processing.</p>
        </section>
      </div>
    </Layout>
  );
}
