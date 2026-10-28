import React from 'react';
import './skeleton.css';
/** Reusable accessible loading surfaces for listings, dashboards and details. */
export default function Skeleton({ variant = 'table', rows = 6, columns = 5, count = 4 }) {
  const bar = (cls = '') => <span className={`skeleton__line ${cls}`} aria-hidden="true" />;
  return (
    <div className={`skeleton skeleton--${variant}`} role="status" aria-label="Loading content">
      {variant === 'table' && (
        <div className="skeleton__table">
          <div className="skeleton__table-head">{Array.from({length: columns}, (_,i) => <div key={i}>{bar('short')}</div>)}</div>
          {Array.from({length: rows}, (_,i) => <div className="skeleton__table-row" key={i}>{Array.from({length: columns},(_,j) => <div key={j}>{bar(j === 0 ? 'medium' : j === columns - 1 ? 'short' : '')}</div>)}</div>)}
        </div>
      )}
      {variant === 'cards' && <div className="skeleton__cards">{Array.from({length: count}, (_,i) => <div className="skeleton__card" key={i}>{bar('short')}{bar('large')}{bar('medium')}</div>)}</div>}
      {variant === 'detail' && <div className="skeleton__detail"><div className="skeleton__image"/><div className="skeleton__detail-body">{bar('short')}{bar('large')}{bar()}{bar('medium')}<div className="skeleton__action"/></div></div>}
      <span className="sr-only">Loading, please wait</span>
    </div>
  );
}
