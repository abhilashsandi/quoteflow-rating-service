import { acmeAutoQuoteConfig } from './base';
import { acmeAutoPortalOverrides, acmeAutoStateOverrides } from './overrides';
import { resolveRouteConfig } from './resolve';
import type { Portal, RouteConfig } from './types';

export { acmeAutoQuoteConfig, acmeAutoPortalOverrides, acmeAutoStateOverrides, resolveRouteConfig };
export type { Portal, RouteConfig };

/** Convenience wrapper: resolves the Acme auto config for a given portal/state in one call. */
export function getAcmeAutoQuoteConfig(portal: Portal, state?: string): RouteConfig {
  return resolveRouteConfig(
    acmeAutoQuoteConfig,
    acmeAutoPortalOverrides,
    acmeAutoStateOverrides,
    portal,
    state,
  );
}
