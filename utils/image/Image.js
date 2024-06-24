const async = require('async');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const validator = require('validator');
const { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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

const s3Client = new S3Client({
  region: AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

const Image = {
  uploadImages: (data, callback) => {
    if (!data || typeof data != 'object')
      return callback('bad_request');

    if (!data.file_name || typeof data.file_name != 'string' || !data.file_name.trim().length || data.file_name.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
      return callback('bad_request');

    if (!data.resize_parameters || !Array.isArray(data.resize_parameters) || !data.resize_parameters.length)
      return callback('bad_request');

    data.name = data.name && typeof data.name == 'string' ? toURLString(data.name) : generateRandomHEX();
    data.fit = data.fit && FIT_PARAMETERS.includes(data.fit) ? data.fit : DEFAULT_FIT_PARAMETER;

    for (let i = 0; i < data.resize_parameters.length; i++) {
      data.resize_parameters[i] = {
        fit: data.fit,
        width: (!data.resize_parameters[i].width || isNaN(parseInt(data.resize_parameters[i].width)) || parseInt(data.resize_parameters[i].width) <= 0 || parseInt(data.resize_parameters[i].width) > MAX_IMAGE_SIZE) ? null : parseInt(data.resize_parameters[i].width),
        height: (!data.resize_parameters[i].height || isNaN(parseInt(data.resize_parameters[i].height)) || parseInt(data.resize_parameters[i].height) <= 0 || parseInt(data.resize_parameters[i].height) > MAX_IMAGE_SIZE) ? null : parseInt(data.resize_parameters[i].height)
      };

      if (!data.resize_parameters[i].width && !data.resize_parameters[i].height)
        return callback('bad_request');
    };

    fs.readFile(path.join(__dirname, '/uploads/' + data.file_name), (err, fileContent) => {
      if (err) return callback('document_not_found');

      async.times(
        data.resize_parameters.length,
        (time, next) => {
          const resizeParameter = data.resize_parameters[time];

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

                s3Client.send(new PutObjectCommand({
                  Bucket: AWS_BUCKET_NAME,
                  Key: imagePath,
                  Body: image,
                  ContentType: 'image/webp',
                  ACL: 'public-read'
                }), err => {
                  if (err) return next('aws_database_error');

                  next(null, {
                    url: `https://${AWS_BUCKET_NAME}.s3.${AWS_BUCKET_REGION}.amazonaws.com/${imagePath}`,
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
    });
  },
  renameImages: (data, callback) => {
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

        generateImagePath({
          name: toURLString(data.name),
          width: urlData.width,
          height: urlData.height
        }, (err, newImagePath) => {
          if (err) return next(err);

          getImagePathFromUrl(urlData.url, (err, oldImagePath) => {
            if (err) return next(err);

            s3Client.send(new CopyObjectCommand({
              Bucket: AWS_BUCKET_NAME,
              CopySource: `${AWS_BUCKET_NAME}/${oldImagePath}`,
              Key: newImagePath,
              ACL: 'public-read'
            }), err => {
              if (err) return next('aws_database_error');

              s3Client.send(new DeleteObjectCommand({
                Bucket: AWS_BUCKET_NAME,
                Key: oldImagePath
              }), err => {
                if (err) return next('aws_database_error');

                next(null, {
                  url: `https://${AWS_BUCKET_NAME}.s3.${AWS_BUCKET_REGION}.amazonaws.com/${newImagePath}`,
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

          s3Client.send(new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: imagePath
          }), err => {
            if (err) return next('aws_database_error');

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