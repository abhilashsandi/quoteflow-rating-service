import type { OverrideSet, Portal } from './types';

// Portal overrides: agents already have the caller on the phone and pull it from CRM, so the
// phone field is hidden (not re-collected) on the agent portal only.
export const acmeAutoPortalOverrides: Partial<Record<Portal, OverrideSet>> = {
  agent: {
    fields: {
      phone: { visible: false },
    },
  },
};

// State overrides: California recognizes domestic partnerships, so CA quotes get an extra
// option on the existing maritalStatus field — the field itself isn't duplicated, only its
// options list changes, per the "visibility, options, validator only" override contract.
export const acmeAutoStateOverrides: Record<string, OverrideSet> = {
  CA: {
    fields: {
      maritalStatus: {
        options: [
          { label: 'Single', value: 'single' },
          { label: 'Married', value: 'married' },
          { label: 'Domestic Partner', value: 'domestic_partner' },
        ],
      },
    },
  },
};
