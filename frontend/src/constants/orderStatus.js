// Mirrors backend app/Constants/OrderStatus.php — keep these two files in
// sync if the order-status flow ever changes. Centralized here because the
// same status list/colors were previously duplicated across OrderHistory.jsx
// and AdminOrders.jsx with slightly different key sets, which is exactly the
// kind of drift that causes a status to render correctly in one screen and
// silently fall back to "undefined" styling in the other.

export const ORDER_STATUS_FLOW = ['pending', 'approved', 'packing', 'dispatched', 'delivered'];
export const ORDER_STATUS_TERMINAL_FAIL = ['rejected', 'cancelled'];
export const ORDER_STATUS_ALL = [...ORDER_STATUS_FLOW, ...ORDER_STATUS_TERMINAL_FAIL];

// Hex colors for plain text/dot indicators (dealer-facing OrderHistory/OrderDetail)
// Aligned to the "Ledger" design system tokens (frontend/src/styles/global.css) —
// in-progress states use the brass accent family, terminal states use
// ledger-green (success) or rust (failure), never an unrelated blue/purple.
export const ORDER_STATUS_COLOR = {
  pending: '#a6650f',    // amber
  approved: '#c08a1e',   // brass
  packing: '#9c6f16',    // brass-deep
  dispatched: '#1a2e44', // ink
  delivered: '#1f7a4d',  // ledger-green
  rejected: '#b3401f',   // rust
  cancelled: '#6b7280',
};

// admin-badge CSS modifier names (admin-facing AdminOrders)
export const ORDER_STATUS_BADGE_VARIANT = {
  pending: 'warning',
  approved: 'success',
  packing: 'neutral',
  dispatched: 'neutral',
  delivered: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};
