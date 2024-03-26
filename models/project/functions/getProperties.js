module.exports = data => {
  const properties = {};

  if (!data || typeof data != 'object')
    return properties;

  if ('is_active' in data && typeof data.is_active == 'boolean')
    properties.is_active = data.is_active;

  if ('is_incentivized' in data && typeof data.is_incentivized == 'boolean')
    properties.is_incentivized = data.is_incentivized;

  if ('is_mainnet' in data && typeof data.is_mainnet == 'boolean')
    properties.is_mainnet = data.is_mainnet;

  if ('is_visible' in data && typeof data.is_visible == 'boolean')
    properties.is_visible = data.is_visible;

  return properties;
};
