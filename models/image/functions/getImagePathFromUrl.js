const validator = require('validator');

/**
 * @param {string} url
 * @returns {string}
 */
module.exports = url => {
  if (!url || !url.length || !validator.isURL(url))
    return;

  return url.split('/')[url.split('/').length - 1];
};