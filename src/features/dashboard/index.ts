/*
 * Dashboard feature — public surface.
 *
 * Figma Core: Usage dashboard (142:496). One screen today; the Admin section
 * (231:4276) is 12 × 1440px DESKTOP frames and is NOT this module's business —
 * it has no home in this repo yet.
 *
 * ADAPTIVE subtree: every colour and type value comes from useTheme(), with one
 * deliberate exception documented in ModelUsageBar (vendor brand hexes, which
 * must not flip with the palette).
 *
 * The numbers themselves are NOT owned here — they live in @/shared/usage,
 * because the conversation view's quota chip reads the same counters and
 * features may not import each other.
 */
export { default as UsageDashboardScreen } from './screens/UsageDashboardScreen';
