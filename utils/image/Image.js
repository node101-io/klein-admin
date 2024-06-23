const async = require('async');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const validator = require('validator');

const generateImagePath = require('./functions/generateImagePath');
const generateRandomHEX = require('../generateRandomHEX');
const getImagePathFromUrl = require('./functions/getImagePathFromUrl');
const toURLString = require('../toURLString');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const AWS_BUCKET_REGION = process.env.AWS_BUCKET_REGION;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const DEFAULT_FIT_PARAMETER = 'cover';
const FIT_PARAMETERS = [ 'contain', 'cover', 'fill', 'inside', 'outside' ];
const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_IMAGE_SIZE = 1e4;

const s3 = new AWS.S3({
  AWS_ACCESS_KEY_ID,
  AWS_BUCKET_NAME,
  AWS_BUCKET_REGION,
  AWS_SECRET_ACCESS_KEY
});

const Image = {
  uploadImages: (data, callback) => {
    if (!data || typeof data != 'object')
      return callback('bad_request');

    if (!data.file_name || typeof data.file_name != 'string' || !data.file_name.trim().length || data.file_name.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
      return callback('bad_request');

    if (data.name && typeof data.name == 'string')
      data.name = toURLString(data.name);
    else
      data.name = generateRandomHEX();

    if (!data.fit || !FIT_PARAMETERS.includes(data.fit))
      data.fit = DEFAULT_FIT_PARAMETER;

    if (!data.resize_parameters || !Array.isArray(data.resize_parameters) || !data.resize_parameters.length)
      return callback('bad_request');

    data.resize_parameters.forEach(resize_parameter => {
      resize_parameter.width = (!resize_parameter.width || isNaN(parseInt(resize_parameter.width)) || parseInt(resize_parameter.width) <= 0 || parseInt(resize_parameter.width) > MAX_IMAGE_SIZE) ? null : parseInt(resize_parameter.width);
      resize_parameter.height = (!resize_parameter.height || isNaN(parseInt(resize_parameter.height)) || parseInt(resize_parameter.height) <= 0 || parseInt(resize_parameter.height) > MAX_IMAGE_SIZE) ? null : parseInt(resize_parameter.height);

      if (!resize_parameter.width && !resize_parameter.height)
        return callback('bad_request');
    });

    const fileContent = fs.readFileSync(path.join(__dirname, '/uploads/' + data.file_name));

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
                Bucket: AWS_BUCKET_NAME,
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
  },
  renameImages: (data, callback) => {
    if (!data || typeof data != 'object')
      return callback('bad_request');

    if (!data.name || !data.name.length || typeof data.name != 'string')
      return callback('bad_request');

    if (!data.url_list || !data.url_list.length || !Array.isArray(data.url_list))
      return callback('bad_request');

    data.name = toURLString(data.name);

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

        generateImagePath({
          name: data.name,
          width: urlData.width,
          height: urlData.height
        }, (err, newImagePath) => {
          if (err) return next(err);

          getImagePathFromUrl(urlData.url, (err, oldImagePath) => {
            if (err) return next(err);

            s3.copyObject({
              Bucket: AWS_BUCKET_NAME,
              CopySource: AWS_BUCKET_NAME + '/' + oldImagePath,
              Key: newImagePath,
              ACL: 'public-read'
            }, err => {
              if (err) return next(err);

              const newImageUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_BUCKET_REGION}.amazonaws.com/${newImagePath}`;

              s3.deleteObject({
                Bucket: AWS_BUCKET_NAME,
                Key: oldImagePath
              }, err => {
                if (err) return next(err);

                next(null, {
                  url: newImageUrl,
                  width: urlData.width,
                  height: urlData.height
                });
              });
            });
          });
        });
      }, (err, url_list) => {
        if (err) return callback(err);

        return callback(null, url_list);
      }
    );
  },
  deleteImages: (url_list, callback) => {
    if (!url_list || !Array.isArray(url_list) || !url_list.length)
      return callback(null);

    async.times(
      url_list.length,
      (time, next) => {
        const urlData = url_list[time];

        if (!urlData || typeof urlData != 'object')
          return next('bad_request');

        if (!urlData.url || !urlData.url.length || !validator.isURL(urlData.url))
          return next('bad_request');

        getImagePathFromUrl(urlData.url, (err, imagePath) => {
          if (err) return next(err);

          s3.deleteObject({
            Bucket: AWS_BUCKET_NAME,
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
  }
};

module.exports = Image;