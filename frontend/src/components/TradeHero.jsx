import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './ui/Icon';

const getImage = product => {
  const first = product?.images?.[0];
  return typeof first === 'string' ? first : first?.image_path;
};

/** New editorial commerce composition. Optional product images are LIVE product API data. */
export default function TradeHero({ variant='home', eyebrow='WHOLESALE, REIMAGINED', title, emphasis, description, count, countLabel='products to discover', products=[] }) {
  const catalog = variant === 'catalog';
  const featuredProducts = useMemo(
    () => products.filter(product => product?.id != null && getImage(product)),
    [products],
  );
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredProduct = featuredProducts[featuredIndex % Math.max(featuredProducts.length, 1)];
  const shots = products.filter(getImage).slice(0,3);

  useEffect(() => {
    if (featuredProducts.length < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setFeaturedIndex(index => (index + 1) % featuredProducts.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [featuredProducts.length]);

  return (
    <section className={`studio-hero studio-hero--${variant}`} aria-label={catalog ? 'Product marketplace' : 'Trade workspace'}>
      <div className="studio-hero__copy">
        <div className="studio-hero__eyebrow"><span className="studio-hero__asterisk">✳</span> {eyebrow}</div>
        <h1>{title || (catalog ? 'Every good business' : 'Make room for')} <em>{emphasis || (catalog ? 'starts somewhere.' : 'what’s next.')}</em></h1>
        <p>{description || 'Discover products, manage trade prices and keep every order moving.'}</p>
        <div className="studio-hero__actions">
          <Link className="studio-hero__cta" to="/products">Explore marketplace <Icon name="arrow" size={18}/></Link>
          <Link className="studio-hero__secondary" to="/orders">My orders <Icon name="chevron" size={17}/></Link>
        </div>
        <div className="studio-hero__micro"><span><Icon name="shield" size={16}/> Account-based pricing</span><span><Icon name="box" size={16}/> Real stock information</span></div>
      </div>
      <div className="studio-hero__composition" aria-hidden="true">
        <div className="studio-hero__orbit studio-hero__orbit--first"/><div className="studio-hero__orbit studio-hero__orbit--second"/>
        <div className="studio-hero__poster studio-hero__poster--back"><span>THE BUYER'S EDIT</span><strong>GOOD<br/>BUSINESS<br/>MOVES.</strong><span className="studio-hero__poster-line"/></div>
        {featuredProduct ? <Link className="studio-hero__poster studio-hero__poster--front" to={`/products/${featuredProduct.id}`} aria-label={`View ${featuredProduct.name || 'product'} details`}><img src={getImage(featuredProduct)} alt={featuredProduct.name || 'Featured product'}/><span>PRODUCT / 001</span></Link> : shots[0] ? <div className="studio-hero__poster studio-hero__poster--front"><img src={getImage(shots[0])} alt={shots[0].name || 'Featured product'}/><span>PRODUCT / 001</span></div> : <div className="studio-hero__poster studio-hero__poster--front studio-hero__poster--graphic"><div className="studio-hero__graphic-star">✳</div><span>CURATED FOR YOUR BUSINESS</span></div>}
        {shots[1] && <div className="studio-hero__mini-photo"><img src={getImage(shots[1])} alt=""/></div>}
        <div className="studio-hero__sticker"><span>DISCOVER / COMPARE / ORDER</span><strong>{count == null ? '01—03' : Number(count).toLocaleString('en-IN')}</strong><small>{count == null ? 'ONE CONNECTED WORKSPACE' : countLabel}</small></div>
        <div className="studio-hero__glyph">✦</div>
      </div>
    </section>
  );
}
