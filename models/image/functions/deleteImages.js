const AWS = require('aws-sdk');
const async = require('async');
const validator = require('validator');

const getImagePathFromURL = require('./getImagePathFromUrl');
const { get } = require('mongoose');

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/**
 * @typedef {{
 * url: string
 * width?: number
 * height?: number
 * }[]} URLListArray
 */

/**
 * @callback deleteImagesCallback
 * @param {AWS.AWSError|Error|string} err
 * @param {null} data
 */

/**
 * @param {URLListArray} url_list
 * @param {deleteImagesCallback} callback
 */
module.exports = (url_list, callback) => {
  if (!url_list || !Array.isArray(url_list) || !url_list.length)
    return callback('bad_request');

  async.times(
    url_list.length,
    (time, next) => {
      const urlData = url_list[time];

      if (!urlData || typeof urlData != 'object')
        return next('bad_request');

      if (!urlData.url || !urlData.url.length || !validator.isURL(urlData.url))
        return next('bad_request');

      getImagePathFromURL(urlData.url, (err, imagePath) => {
        if (err) return next(err);

        s3.deleteObject({
          Bucket: BUCKET_NAME,
          Key: imagePath
        }, err => {
          if (err) return next(err);

          next(null);
        });
      });
    }, err => {
      if (err) return callback(err);

      return callback(null);
    }
  );
};
