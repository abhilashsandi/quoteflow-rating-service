import { getVantageAutoQuoteConfig } from './index';

function findField(config: ReturnType<typeof getVantageAutoQuoteConfig>, pageKey: string, key: string) {
  return config.pages
    .find((page) => page.key === pageKey)
    ?.sections[0]?.fields.find((field) => field.key === key);
}

describe('Vantage route config override chain', () => {
  it('customer portal: has two pages, driver-info and vehicle-info', () => {
    const config = getVantageAutoQuoteConfig('customer');
    expect(config.pages.map((page) => page.key)).toEqual(['driver-info', 'vehicle-info']);
  });

  it('customer portal, no state: vin field is present', () => {
    const config = getVantageAutoQuoteConfig('customer');
    expect(findField(config, 'vehicle-info', 'vin')).toBeDefined();
  });

  it('agent portal: vin field is hidden (visibility override), other vehicle fields unaffected', () => {
    const config = getVantageAutoQuoteConfig('agent');
    expect(findField(config, 'vehicle-info', 'vin')).toBeUndefined();
    expect(findField(config, 'vehicle-info', 'make')).toBeDefined();
  });

  it('agent portal: driver-info page is untouched (override only targets vehicle-info)', () => {
    const config = getVantageAutoQuoteConfig('agent');
    expect(findField(config, 'driver-info', 'firstName')).toBeDefined();
  });
});
