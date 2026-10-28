export const FREE_SHIPPING_THRESHOLD = 2500; // ₹
export const FLAT_SHIPPING_FEE = 99; // ₹

export const PRICE_PRESETS = [
  { label: "Under ₹2,000", min: 0, max: 2000 },
  { label: "₹2,000 – ₹5,000", min: 2000, max: 5000 },
  { label: "₹5,000 – ₹10,000", min: 5000, max: 10000 },
  { label: "Over ₹10,000", min: 10000, max: undefined },
];
