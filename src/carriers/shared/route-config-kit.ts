// Browser-safe: bundled directly into every carrier's config bundle (see scripts/bundle-lib.ts)
// — the generic Page -> Section -> Field schema and the Base -> Portal -> State resolver every
// carrier's routeConfigs/index.ts uses. No server-only imports here, ever.

export type FieldType = 'text' | 'select' | 'date' | 'checkbox';
export type Portal = 'agent' | 'customer';

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Name of a validator exported from src/validators' bundle (see manifest.json's `validators` key). */
  validator?: string;
  options?: SelectOption[];
}

export interface SectionDef {
  key: string;
  title: string;
  fields: FieldDef[];
}

export interface PageDef {
  key: string;
  title: string;
  sections: SectionDef[];
}

export interface RouteConfig {
  pages: PageDef[];
}

/** A field-level delta: only visibility, options, and validator may be overridden — never the field's identity. */
export interface FieldOverride {
  visible?: boolean;
  options?: SelectOption[];
  validator?: string;
}

export interface OverrideSet {
  /** fieldKey -> override */
  fields: Record<string, FieldOverride>;
}

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
 * Base -> Portal -> State resolution. Pure and browser-safe: this is exported from every
 * carrier's config bundle so the browser can resolve state-level overrides itself without
 * another round trip once it already has the portal-resolved config and the state override
 * map. Carrier-agnostic — shared by every carrier's routeConfigs/index.ts (acme, vantage, ...).
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
