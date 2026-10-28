import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/** Low-cost page progress: transform is updated inside one rAF, not React state. */
export default function ScrollProgress() {
    const progressRef = useRef(null);
    const location = useLocation();
    useEffect(() => {
        let frame = 0;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const root = document.documentElement;
                const scrollable = Math.max(1, root.scrollHeight - root.clientHeight);
                const percentage = Math.min(1, Math.max(0, window.scrollY / scrollable));
                if (progressRef.current) progressRef.current.style.transform = `scaleX(${percentage})`;
            });
        };
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
            cancelAnimationFrame(frame);
        };
    }, [location.pathname]);
    return <div className="experience-scroll-progress" aria-hidden="true"><span ref={progressRef}/></div>;
}
