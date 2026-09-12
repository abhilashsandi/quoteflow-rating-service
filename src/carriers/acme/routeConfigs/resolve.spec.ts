import { getAcmeAutoQuoteConfig } from './index';

function findField(config: ReturnType<typeof getAcmeAutoQuoteConfig>, key: string) {
  return config.pages[0]?.sections[0]?.fields.find((field) => field.key === key);
}

describe('Acme route config override chain', () => {
  it('customer portal, no state: base config unchanged', () => {
    const config = getAcmeAutoQuoteConfig('customer');
    expect(findField(config, 'phone')).toBeDefined();
    expect(findField(config, 'maritalStatus')?.options).toEqual([
      { label: 'Single', value: 'single' },
      { label: 'Married', value: 'married' },
    ]);
  });

  it('agent portal: phone field is hidden (visibility override)', () => {
    const config = getAcmeAutoQuoteConfig('agent');
    expect(findField(config, 'phone')).toBeUndefined();
    expect(findField(config, 'firstName')).toBeDefined();
  });

  it('customer portal + CA state: maritalStatus gains the Domestic Partner option', () => {
    const config = getAcmeAutoQuoteConfig('customer', 'CA');
    expect(findField(config, 'maritalStatus')?.options).toEqual([
      { label: 'Single', value: 'single' },
      { label: 'Married', value: 'married' },
      { label: 'Domestic Partner', value: 'domestic_partner' },
    ]);
  });

  it('agent portal + CA state: both overrides apply (phone hidden AND CA options)', () => {
    const config = getAcmeAutoQuoteConfig('agent', 'CA');
    expect(findField(config, 'phone')).toBeUndefined();
    expect(findField(config, 'maritalStatus')?.options).toHaveLength(3);
  });

  it('unknown state: falls back to the portal-resolved config with no throw', () => {
    const config = getAcmeAutoQuoteConfig('customer', 'ZZ');
    expect(findField(config, 'maritalStatus')?.options).toHaveLength(2);
  });
});
