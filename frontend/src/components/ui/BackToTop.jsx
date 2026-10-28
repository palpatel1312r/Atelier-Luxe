import { useEffect, useState } from "react";
/** An accessible, low-profile page utility; never blocks purchase controls. */
export default function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 650);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button type="button" className={`trade-v12-backtop ${show ? "is-visible" : ""}`}
      tabIndex={show ? 0 : -1} aria-hidden={!show} aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
      <span aria-hidden="true">↑</span>
    </button>
  );
}
