const validator = require('validator');

module.exports = data => {
  const accounts = {};

  if (!data || typeof data != 'object')
    return accounts;

  if (data.web && validator.isURL(data.web.toString()))
    accounts.web = data.web.toString().trim();

  if (data.faucet && validator.isURL(data.faucet.toString()))
    accounts.faucet = data.faucet.toString().trim();

  return accounts;
};
