import { HttpError } from '../middleware/error-handler';
import { validatePatchOpsAgainstSchema, type CarrierSchema } from './quote-validation';

const schema: CarrierSchema = {
  pages: [
    {
      key: 'driver-info',
      title: 'Driver Information',
      sections: [
        {
          key: 'personal',
          title: 'Personal Information',
          fields: [
            { key: 'firstName', label: 'First name', type: 'text', required: true },
            { key: 'dob', label: 'Date of birth', type: 'date', required: true },
            { key: 'middleName', label: 'Middle name', type: 'text', required: false },
            { key: 'ssn', label: 'SSN', type: 'text', required: true, validator: 'ssn' },
          ],
        },
      ],
    },
  ],
};

describe('validatePatchOpsAgainstSchema', () => {
  it('accepts a valid add/replace op against a known field', () => {
    expect(() =>
      validatePatchOpsAgainstSchema(
        [{ op: 'replace', path: '/driver-info/firstName', value: 'Jane' }],
        schema,
      ),
    ).not.toThrow();
  });

  it('rejects an unknown field path', () => {
    expect(() =>
      validatePatchOpsAgainstSchema([{ op: 'replace', path: '/driver-info/notAField', value: 'x' }], schema),
    ).toThrow(HttpError);
  });

  it('rejects a missing required field value', () => {
    expect(() =>
      validatePatchOpsAgainstSchema([{ op: 'replace', path: '/driver-info/firstName', value: '' }], schema),
    ).toThrow(HttpError);
  });

  it('allows an optional field to be empty', () => {
    expect(() =>
      validatePatchOpsAgainstSchema([{ op: 'replace', path: '/driver-info/middleName', value: '' }], schema),
    ).not.toThrow();
  });

  it('rejects an invalid date string for a date field', () => {
    expect(() =>
      validatePatchOpsAgainstSchema(
        [{ op: 'replace', path: '/driver-info/dob', value: 'not-a-date' }],
        schema,
      ),
    ).toThrow(HttpError);
  });

  it('rejects unsupported patch ops like remove', () => {
    expect(() =>
      validatePatchOpsAgainstSchema([{ op: 'remove', path: '/driver-info/firstName' }], schema),
    ).toThrow(HttpError);
  });

  it('accepts a value that passes its named validator (reuses src/validators)', () => {
    expect(() =>
      validatePatchOpsAgainstSchema(
        [{ op: 'replace', path: '/driver-info/ssn', value: '123-45-6789' }],
        schema,
      ),
    ).not.toThrow();
  });

  it('rejects a value that fails its named validator (invalid SSN prefix)', () => {
    expect(() =>
      validatePatchOpsAgainstSchema(
        [{ op: 'replace', path: '/driver-info/ssn', value: '000-45-6789' }],
        schema,
      ),
    ).toThrow(HttpError);
  });

  it('rejects a malformed path shape', () => {
    expect(() =>
      validatePatchOpsAgainstSchema([{ op: 'replace', path: '/onlyOneSegment', value: 'x' }], schema),
    ).toThrow(HttpError);
  });
});
