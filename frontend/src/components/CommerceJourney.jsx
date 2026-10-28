import { Link } from 'react-router-dom';
import Icon from './ui/Icon';
import Reveal from './ui/Reveal';

/** Clear shortcuts into existing trading flows. No synthetic business data or new API calls. */
const JOURNEY = [
  { step: '01', icon: 'search', tone: 'ocean', heading: 'Find products that fit', copy: 'Discover new arrivals and refine by brand, availability or trade price.', href: '/products', link: 'Browse catalog' },
  { step: '02', icon: 'tag', tone: 'mint', heading: 'Compare your trade rates', copy: 'Check the product and quantity pricing available to your account.', href: '/products', link: 'Explore prices' },
  { step: '03', icon: 'repeat', tone: 'peach', heading: 'Restock with confidence', copy: 'Review previous orders and repeat a purchase when you need to replenish.', href: '/orders', link: 'Your orders' },
];

export default function CommerceJourney({ compact = false }) {
  return <Reveal as="section" className={`journey-section ${compact ? 'journey-section--compact' : ''}`}>
    <div className="journey-section__head">
      <div><p className="section-overline">THE SMARTER WAY TO WHOLESALE</p><h2>Built for the way <em>you do business.</em></h2></div>
      <span className="journey-section__stamp"><Icon name="sparkles" size={16}/> Source · Order · Grow</span>
    </div>
    <div className="journey-grid">
      {JOURNEY.map((item, i) => <Link key={item.step} to={item.href} className={`journey-card journey-card--${item.tone}`} style={{ '--item-order': i }}>
        <div className="journey-card__top"><span className="journey-card__icon"><Icon name={item.icon} size={23}/></span><span className="journey-card__step">{item.step} / 03</span></div>
        <h3>{item.heading}</h3><p>{item.copy}</p>
        <span className="journey-card__link">{item.link} <Icon name="arrow" size={16}/></span>
      </Link>)}
    </div>
  </Reveal>;
}
