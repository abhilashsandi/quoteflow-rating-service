import type { Operation } from 'fast-json-patch';
import { HttpError } from '../middleware/error-handler';
import { validators, type ValidatorName } from '../validators';

export interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  validator?: string;
}

export interface SectionConfig {
  key: string;
  title: string;
  fields: FieldConfig[];
}

export interface PageConfig {
  key: string;
  title: string;
  sections: SectionConfig[];
}

export interface CarrierSchema {
  pages: PageConfig[];
}

export function flattenFieldsByPage(schema: CarrierSchema): Map<string, Map<string, FieldConfig>> {
  const byPage = new Map<string, Map<string, FieldConfig>>();
  for (const page of schema.pages) {
    const fields = new Map<string, FieldConfig>();
    for (const section of page.sections) {
      for (const field of section.fields) {
        fields.set(field.key, field);
      }
    }
    byPage.set(page.key, fields);
  }
  return byPage;
}

const PATCH_PATH_RE = /^\/([^/]+)\/([^/]+)$/;

/**
 * Server-side re-validation of JSON Patch ops against the resolved carrier config — the
 * browser validates too (see the validator bundler in step 6), but this service never trusts
 * that. Only `add`/`replace` against a known `/pageKey/fieldKey` path are accepted; every
 * other shape is rejected rather than silently ignored.
 */
export function validatePatchOpsAgainstSchema(ops: Operation[], schema: CarrierSchema): void {
  const byPage = flattenFieldsByPage(schema);
  for (const op of ops) {
    if (op.op !== 'add' && op.op !== 'replace') {
      throw new HttpError(400, 'unsupported_patch_op', { op: op.op, path: op.path });
    }
    const match = PATCH_PATH_RE.exec(op.path);
    if (!match) {
      throw new HttpError(400, 'invalid_patch_path', { path: op.path, expected: '/pageKey/fieldKey' });
    }
    const [, pageKey, fieldKey] = match;
    if (!pageKey || !fieldKey) {
      throw new HttpError(400, 'invalid_patch_path', { path: op.path, expected: '/pageKey/fieldKey' });
    }
    const field = byPage.get(pageKey)?.get(fieldKey);
    if (!field) {
      throw new HttpError(400, 'unknown_field', { pageKey, fieldKey });
    }

    const value = (op as { value?: unknown }).value;
    if (field.required && (value === undefined || value === null || value === '')) {
      throw new HttpError(400, 'field_required', { pageKey, fieldKey });
    }
    if (value !== undefined && value !== null && typeof value !== 'string') {
      throw new HttpError(400, 'field_must_be_string', { pageKey, fieldKey });
    }
    if (field.type === 'date' && typeof value === 'string' && Number.isNaN(Date.parse(value))) {
      throw new HttpError(400, 'field_invalid_date', { pageKey, fieldKey, value });
    }

    // Reuses the exact same pure function the browser bundle ships (src/validators/**) —
    // tightening a regex there is a backend-only change that applies here too on redeploy,
    // with zero duplication of the rule.
    if (field.validator && typeof value === 'string' && value !== '') {
      const validate = validators[field.validator as ValidatorName] as
        ((v: string) => { valid: boolean; message?: string }) | undefined;
      if (validate) {
        const result = validate(value);
        if (!result.valid) {
          throw new HttpError(400, 'field_validator_failed', { pageKey, fieldKey, message: result.message });
        }
      }
    }
  }
}
