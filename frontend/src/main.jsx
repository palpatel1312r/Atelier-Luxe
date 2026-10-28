import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
// The legacy component skins preserve non-redesigned screens; Arcwell is the single visual authority.
import "./styles/premium.css";
import "./styles/meridian.css";
import "./styles/atelier.css";
import "./styles/arcwell.css";
import "./styles/motion-themes.css";
import "./styles/experience-motion.css";
import "./styles/studio-commerce.css";
// Enterprise Slate design tokens and accessible UI primitives are the final visual authority.
import "./styles/enterprise-slate.css";
import "./styles/ui-polish.css";
import "./styles/responsive-mobile.css";
import "./styles/multi-theme.css";
import "./styles/no-sidebar.css";
// Final component-first UI system; overrides historical styles without changing legacy routes.
import "./styles/trade-v12.css";
// Buyer-only atmospheric canvas. Imported last so it can replace the flat
// legacy shell backgrounds without changing admin surfaces.
import "./styles/buyer-background.css";
import "./styles/buyer-product-cards.css";
import "./styles/colorful-surfaces.css";
import { applyMotionLevel, applyTradeTheme, readMotionLevel, readTradeTheme } from "./theme";
// Apply the saved palette before mounting React to avoid a flash of the default theme.
applyTradeTheme(readTradeTheme());
applyMotionLevel(readMotionLevel());
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { CartProvider } from "./context/CartContext";

const StrictMode =
    import.meta.env.PROD ? React.Fragment : React.StrictMode;
ReactDOM.createRoot(document.getElementById("root")).render(
    <StrictMode>
        <AuthProvider>
            <WishlistProvider>
                <CartProvider>
                    <App />
                </CartProvider>
            </WishlistProvider>
        </AuthProvider>
    </StrictMode>,
);
