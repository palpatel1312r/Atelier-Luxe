import { useEffect, useRef, useState } from 'react';

/** Animate content once it reaches the viewport. No animation if observers are unavailable. */
export default function Reveal({ as: Component = 'div', children, className = '', delay = 0, ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.07, rootMargin: '0px 0px 55px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <Component ref={ref} className={`reveal-up ${visible ? 'reveal-up--visible' : ''} ${className}`} style={{ '--reveal-delay': `${Math.min(delay, 500)}ms` }} {...props}>{children}</Component>;
}
