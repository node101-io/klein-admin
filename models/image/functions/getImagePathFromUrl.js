const validator = require('validator');

/**
 * @callback getImagePathFromURLCallback
 * @param {string} err
 * @param {string} imagePath
 */

/**
 * @param {string} url
 * @param {getImagePathFromURLCallback} callback
 */
module.exports = (url, callback) => {
  if (!url || !url.length || !validator.isURL(url))
    return callback('bad_request');

  const imagePath = url.split('/')[url.split('/').length - 1];
  return callback(null, imagePath);
};