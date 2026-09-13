import type { RouteConfig } from './types';

// The base (portal- and state-agnostic) Vantage Direct Auto quote config. Two pages, unlike
// Acme's one — Vantage also collects vehicle info up front (its API-driven bind needs a VIN;
// Acme's Playwright-driven bind only ever needed a quoteId). Portal and state overrides in
// overrides.ts layer on top of this via resolve.ts's Base -> Portal -> State chain.
export const vantageAutoQuoteConfig: RouteConfig = {
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
          ],
        },
      ],
    },
    {
      key: 'vehicle-info',
      title: 'Vehicle Information',
      sections: [
        {
          key: 'vehicle',
          title: 'Your Vehicle',
          fields: [
            { key: 'vin', label: 'VIN', type: 'text', required: true, validator: 'vin' },
            { key: 'make', label: 'Make', type: 'text', required: true },
            { key: 'model', label: 'Model', type: 'text', required: true },
            {
              key: 'year',
              label: 'Model year',
              type: 'select',
              required: true,
              options: ['2026', '2025', '2024', '2023', '2022', '2021', '2020'].map((year) => ({
                label: year,
                value: year,
              })),
            },
          ],
        },
      ],
    },
  ],
};
