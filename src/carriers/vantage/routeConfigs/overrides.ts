import type { OverrideSet, Portal } from './types';

// Portal overrides: agents already have the vehicle's VIN from the customer's DMS/telematics
// feed, so this field is hidden (not re-collected) on the agent portal only — the same
// "visibility, options, validator only" contract as Acme's phone-field override, just applied
// to a different field on this carrier's own vehicle-info page.
export const vantageAutoPortalOverrides: Partial<Record<Portal, OverrideSet>> = {
  agent: {
    fields: {
      vin: { visible: false },
    },
  },
};

// No state overrides for Vantage yet — Acme's routeConfigs already demonstrates that chain
// (CA's maritalStatus options); an empty map here is a valid, common case, not a gap.
export const vantageAutoStateOverrides: Record<string, OverrideSet> = {};
