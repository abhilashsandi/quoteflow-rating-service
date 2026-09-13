import { vantageAutoQuoteConfig } from './base';
import { vantageAutoPortalOverrides, vantageAutoStateOverrides } from './overrides';
import { resolveRouteConfig } from './resolve';
import type { Portal, RouteConfig } from './types';

export { vantageAutoQuoteConfig, vantageAutoPortalOverrides, vantageAutoStateOverrides, resolveRouteConfig };
export type { Portal, RouteConfig };

/** Convenience wrapper: resolves the Vantage Direct auto config for a given portal/state in one call. */
export function getVantageAutoQuoteConfig(portal: Portal, state?: string): RouteConfig {
  return resolveRouteConfig(
    vantageAutoQuoteConfig,
    vantageAutoPortalOverrides,
    vantageAutoStateOverrides,
    portal,
    state,
  );
}
