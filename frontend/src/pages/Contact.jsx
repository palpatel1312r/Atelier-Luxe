import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/ui/Icon";
import "../styles/static-page.css";

export default function Contact() {
    return (
        <Layout>
            <main className="static-page contact-page">
                <section className="contact-hero">
                    <div className="contact-hero__copy">
                        <span className="contact-page__eyebrow">
                            Buyer support desk
                        </span>
                        <h1>Let’s get your order moving.</h1>
                        <p>
                            Questions about products, pricing, delivery, or an
                            existing order? Our wholesale support team is ready
                            to help.
                        </p>
                        <div className="contact-hero__actions">
                            <Link
                                className="contact-button contact-button--primary"
                                to="/chat"
                            >
                                <Icon name="message" size={18} /> Chat with
                                admin <Icon name="arrow" size={17} />
                            </Link>
                            <a
                                className="contact-button contact-button--secondary"
                                href="mailto:support@yourcompany.com"
                            >
                                Email support
                            </a>
                        </div>
                    </div>
                    <div className="contact-hero__visual" aria-hidden="true">
                        <div className="contact-hero__orb">
                            <Icon name="message" size={34} />
                        </div>
                        <div className="contact-hero__status">
                            <i /> Support team online
                        </div>
                        <div className="contact-hero__ticket">
                            <span>Typical response</span>
                            <strong>Within one business day</strong>
                        </div>
                    </div>
                </section>

                <section
                    className="contact-page__channels"
                    aria-label="Contact options"
                >
                    <a className="contact-channel" href="tel:+910000000000">
                        <span className="contact-channel__icon">
                            <Icon name="user" size={22} />
                        </span>
                        <span className="contact-channel__label">
                            Call our team
                        </span>
                        <strong>+91 00000 00000</strong>
                        <small>For urgent order assistance</small>
                        <span className="contact-channel__arrow">
                            <Icon name="arrow" size={17} />
                        </span>
                    </a>
                    <a
                        className="contact-channel"
                        href="mailto:support@yourcompany.com"
                    >
                        <span className="contact-channel__icon">
                            <Icon name="message" size={22} />
                        </span>
                        <span className="contact-channel__label">
                            Write to us
                        </span>
                        <strong>support@yourcompany.com</strong>
                        <small>Share documents and detailed queries</small>
                        <span className="contact-channel__arrow">
                            <Icon name="arrow" size={17} />
                        </span>
                    </a>
                    <div className="contact-channel">
                        <span className="contact-channel__icon">
                            <Icon name="dashboard" size={22} />
                        </span>
                        <span className="contact-channel__label">
                            Business hours
                        </span>
                        <strong>Mon–Sat, 10 AM–7 PM</strong>
                        <small>Indian Standard Time (IST)</small>
                    </div>
                </section>

                <section className="contact-page__assist">
                    <div className="contact-page__assist-icon">
                        <Icon name="shield" size={25} />
                    </div>
                    <div>
                        <span>Need help with an existing order?</span>
                        <h2>Keep your order number handy</h2>
                        <p>
                            It helps our support team resolve delivery, payment,
                            or product questions faster.
                        </p>
                    </div>
                    <Link to="/chat">
                        Open support chat <Icon name="arrow" size={16} />
                    </Link>
                </section>
            </main>
        </Layout>
    );
}
