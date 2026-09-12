// Browser-safe: this whole directory gets esbuild-bundled and imported directly in the
// browser (see scripts/build-bundles.ts), same rule as src/validators/**. No server-only
// imports (fs, db, process.env) here.

export type FieldType = 'text' | 'select' | 'date';
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
