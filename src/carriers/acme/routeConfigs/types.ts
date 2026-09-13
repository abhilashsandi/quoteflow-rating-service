// Browser-safe: this whole directory gets esbuild-bundled and imported directly in the
// browser (see scripts/build-bundles.ts). The actual type defs are carrier-agnostic and live
// in ../../shared/route-config-kit.ts (shared with every other carrier) — re-exported here so
// this directory's existing imports don't need to change.
export type {
  FieldType,
  Portal,
  SelectOption,
  FieldDef,
  SectionDef,
  PageDef,
  RouteConfig,
  FieldOverride,
  OverrideSet,
} from '../../shared/route-config-kit';
