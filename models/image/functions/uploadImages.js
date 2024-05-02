const async = require('async');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const generateImagePath = require('./generateImagePath');

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const DEFAULT_FIT_PARAMETER = 'cover';
const FIT_PARAMETERS = ['contain', 'cover', 'fill', 'inside', 'outside'];
const MAX_IMAGE_SIZE = 1e4;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/**
 * @callback uploadImagesCallback
 * @param {AWS.AWSError|Error|string} err
 * @param {Array.<{url: string, width?: number, height?: number}>} url_list
 */

/**
 * @param {{ name: string, file_name: string, fit: string, resize_parameters: Array.<{width?: number, height?: number}> }} data
 * @param {uploadImagesCallback} callback
 */
module.exports = (data, callback) => {
  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.name || typeof data.name != 'string' || !data.name.length)
    return callback('bad_request');

  if (!data.file_name || typeof data.file_name != 'string' || !data.file_name.length)
    return callback('bad_request');

  if (!data.fit)
    data.fit = DEFAULT_FIT_PARAMETER;

  if (!FIT_PARAMETERS.includes(data.fit))
    return callback('bad_request');

  if (!data.resize_parameters || !Array.isArray(data.resize_parameters) || !data.resize_parameters.length)
    return callback('bad_request');

  const fileContent = fs.readFileSync(path.join(__dirname, '../uploads/ ' + data.file_name));

  const resizeParameters = data.resize_parameters.map(parameter => {
    return {
      fit: data.fit,
      width: parameter?.width,
      height: parameter?.height
    };
  });

  async.times(
    resizeParameters.length,
    (time, next) => {
      const resizeParameter = resizeParameters[time];

      resizeParameter.width = (!resizeParameter.width || isNaN(parseInt(resizeParameter.width)) || parseInt(resizeParameter.width) <= 0 || parseInt(resizeParameter.width) > MAX_IMAGE_SIZE) ? null : parseInt(resizeParameter.width);
      resizeParameter.height = (!resizeParameter.height || isNaN(parseInt(resizeParameter.height)) || parseInt(resizeParameter.height) <= 0 || parseInt(resizeParameter.height) > MAX_IMAGE_SIZE) ? null : parseInt(resizeParameter.height);

      if (!resizeParameter.width && !resizeParameter.height)
        return next('bad_request');

      sharp(fileContent)
        .resize(resizeParameter)
        .webp()
        .toBuffer()
        .then(image => {
          generateImagePath({
            name: data.name,
            width: resizeParameter.width,
            height: resizeParameter.height
          }, (err, imagePath) => {
            if (err) return next(err);

            const uploadParams = {
              Bucket: BUCKET_NAME,
              Key: imagePath,
              Body: image,
              ContentType: 'image/webp',
              ACL: 'public-read'
            };

            s3.upload(uploadParams, (err, response) => {
              if (err) return next(err);

              next(null, {
                url: response.Location,
                width: resizeParameter.width,
                height: resizeParameter.height
              });
            });
          });
        })
        .catch(_ => next('database_error'));
    }, (err, url_list) => {
      if (err) return callback(err);

      return callback(null, url_list);
    }
  );
};