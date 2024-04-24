const AWS = require('aws-sdk');
const validator = require('validator');

const generateImagePath = require('./generateImagePath');
const getImagePathFromUrl = require('./getImagePathFromUrl');

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const MAX_IMAGE_SIZE = 1e4;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/**
 * @callback renameImagesCallback
 * @param {AWS.AWSError|Error|string} err
 * @param {Array.<{
 *   url: string,
 *   width?: number,
 *   height?: number
 * }>} url_list
 */

/**
 * @param {{
 *   name: string,
 *   url_list: Array.<{
 *     url: string,
 *     width?: number,
 *     height?: number
 *   }>
 * }} data
 * @param {renameImagesCallback} callback
 */
module.exports = (data, callback) => {
  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.name || !data.name.length || typeof data.name != 'string')
    return callback('bad_request');

  if (!data.url_list || !data.url_list.length || !Array.isArray(data.url_list))
    return callback('bad_request');

  async.times(
    data.url_list.length,
    (time, next) => {
      const urlData = data.url_list[time];

      if (!urlData || typeof urlData != 'object')
        return next('bad_request');

      if (!urlData.url || !urlData.url.length || !validator.isURL(urlData.url))
        return next('bad_request');

      urlData.width = (!urlData.width || isNaN(parseInt(urlData.width)) || parseInt(urlData.width) <= 0 || parseInt(urlData.width) > MAX_IMAGE_SIZE) ? null : parseInt(urlData.width);
      urlData.height = (!urlData.height || isNaN(parseInt(urlData.height)) || parseInt(urlData.height) <= 0 || parseInt(urlData.height) > MAX_IMAGE_SIZE) ? null : parseInt(urlData.height);

      if (!urlData.width && !urlData.height)
        return next('bad_request');

      s3.copyObject({
        Bucket: BUCKET_NAME,
        CopySource: BUCKET_NAME + '/' + getImagePathFromUrl(urlData.url),
        Key: generateImagePath({
          name: data.name,
          width: urlData.width,
          height: urlData.height
        })
      }, (err, image) => {
        if (err) return next(err);

        s3.deleteObject({
          Bucket: BUCKET_NAME,
          Key: getImagePathFromUrl(urlData.url)
        }, err => {
          if (err) return next(err);

          next(null, {
            url: image.Location,
            width: urlData.width,
            height: urlData.height
          });
        });
      });
    }, (err, url_list) => {
      if (err) return callback(err);

      return callback(null, url_list);
    }
  );
};