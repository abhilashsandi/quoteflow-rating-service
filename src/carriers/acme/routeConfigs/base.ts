import type { RouteConfig } from './types';

// The base (portal- and state-agnostic) Acme Auto quote config. Portal and state overrides in
// overrides.ts layer on top of this via resolve.ts's Base -> Portal -> State chain.
export const acmeAutoQuoteConfig: RouteConfig = {
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
            { key: 'lastName', label: 'Last name', type: 'text', required: true },
            { key: 'dob', label: 'Date of birth', type: 'date', required: true },
            { key: 'ssn', label: 'Social Security Number', type: 'text', required: true, validator: 'ssn' },
            { key: 'phone', label: 'Phone number', type: 'text', required: true, validator: 'phone' },
            {
              key: 'maritalStatus',
              label: 'Marital status',
              type: 'select',
              required: true,
              options: [
                { label: 'Single', value: 'single' },
                { label: 'Married', value: 'married' },
              ],
            },
            { key: 'isMarried', label: 'Is married', type: 'checkbox' },
          ],
        },
      ],
    },
  ],
};
