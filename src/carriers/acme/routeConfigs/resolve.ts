import type { FieldDef, OverrideSet, Portal, RouteConfig } from './types';

function applyOverrideSet(config: RouteConfig, overrideSet: OverrideSet | undefined): RouteConfig {
  if (!overrideSet) return config;
  return {
    pages: config.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        fields: section.fields
          .map((field): FieldDef => {
            const override = overrideSet.fields[field.key];
            if (!override) return field;
            return {
              ...field,
              ...(override.options ? { options: override.options } : {}),
              ...(override.validator ? { validator: override.validator } : {}),
            };
          })
          .filter((field) => overrideSet.fields[field.key]?.visible !== false),
      })),
    })),
  };
}

/**
 * Base -> Portal -> State resolution. Pure and browser-safe: this is exported from the config
 * bundle so the browser can resolve state-level overrides itself without another round trip
 * once it already has the portal-resolved config and the state override map.
 */
export function resolveRouteConfig(
  base: RouteConfig,
  portalOverrides: Partial<Record<Portal, OverrideSet>>,
  stateOverrides: Record<string, OverrideSet>,
  portal: Portal,
  state?: string,
): RouteConfig {
  let resolved = applyOverrideSet(base, portalOverrides[portal]);
  if (state) resolved = applyOverrideSet(resolved, stateOverrides[state]);
  return resolved;
}
