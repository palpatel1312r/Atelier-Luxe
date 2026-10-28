import { Link } from "react-router-dom";
import Icon from "./ui/Icon";
const steps = [
    {
        number: "01",
        icon: "search",
        title: "Find the right products",
        text: "Search the assortment and narrow it down with purposeful filters.",
        to: "/products",
        label: "Browse catalog",
    },
    {
        number: "02",
        icon: "tag",
        title: "See your trade price",
        text: "Check your account-specific rate, pack sizes, and available stock.",
        to: "/products",
        label: "Compare products",
    },
    {
        number: "03",
        icon: "truck",
        title: "Keep orders moving",
        text: "Review purchases and follow their progress without switching tools.",
        to: "/orders",
        label: "Track orders",
    },
];
export default function TradeSteps() {
    return (
        <section className="arc-steps" aria-labelledby="arc-steps-title">
            <div className="arc-section-title">
                <div>
                    <span className="arc-kicker">
                        BUILT AROUND YOUR WORKFLOW
                    </span>
                    <h2 id="arc-steps-title">From discovery to delivery.</h2>
                    {/* <p>
                        A simpler path from choosing products to keeping your
                        shelves stocked.
                    </p> */}
                </div>
                <span className="arc-section-mark" aria-hidden="true">
                    / 03
                </span>
            </div>
            <div className="arc-steps__grid">
                {steps.map((step, i) => (
                    <Link
                        to={step.to}
                        className={`arc-step arc-step--${i + 1}`}
                        key={step.number}
                    >
                        <div className="arc-step__head">
                            <span className="arc-step__number">
                                {step.number}
                            </span>
                            <span className="arc-step__icon">
                                <Icon name={step.icon} size={23} />
                            </span>
                        </div>
                        <h3>{step.title}</h3>
                        <p>{step.text}</p>
                        <span className="arc-step__cta">
                            {step.label} <Icon name="arrow" size={16} />
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
