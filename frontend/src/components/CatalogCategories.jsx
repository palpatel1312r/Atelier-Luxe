import Icon from './ui/Icon';
import Reveal from './ui/Reveal';

const TONES = ['navy', 'teal', 'coral', 'blue', 'lime', 'violet'];

/** Category navigation uses real API categories and the existing category filter handler. */
export default function CatalogCategories({ categories = [], active, onSelect }) {
  if (!categories.length) return null;
  return <Reveal as="section" className="catalog-collections" aria-label="Shop by category">
    <div className="catalog-collections__heading"><div><p className="section-overline">START EXPLORING</p><h2>Shop by category</h2><p>Go straight to the products your business needs.</p></div><span className="catalog-collections__hint">Curated from your catalog <Icon name="arrow" size={17}/></span></div>
    <div className="catalog-collections__grid">
      {categories.slice(0, 6).map((category, index) => <button key={category.id} type="button" onClick={() => onSelect(String(category.id))} aria-pressed={active === String(category.id)} className={`catalog-collection catalog-collection--${TONES[index % TONES.length]} ${active === String(category.id) ? 'is-selected' : ''}`}>
        <span className="catalog-collection__number">0{index + 1}</span>
        <span className="catalog-collection__orb"><Icon name={index % 2 ? 'layers' : 'box'} size={31}/></span>
        <span className="catalog-collection__label">{category.name}</span>
        <span className="catalog-collection__action"><Icon name="arrow" size={17}/></span>
      </button>)}
    </div>
  </Reveal>;
}
