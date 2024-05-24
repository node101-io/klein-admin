const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const deleteImages = require('./functions/deleteImages');
const formatImage = require('./functions/formatImage');
const generateRandomImageName = require('./functions/generateRandomImageName');
const getImagePathFromURL = require('./functions/getImagePathFromUrl');
const renameImages = require('./functions/renameImages');
const toImageURLString = require('./functions/toImageURLString');
const uploadImages = require('./functions/uploadImages');
const e = require('express');

const DEFAULT_FIT_PARAMETER = 'cover';
const DUPLICATED_UNIQUE_FIELD_ERROR_CODE = 11000;
const EXPIRED_IMAGE_DELETION_LIMIT = 10;
const FIT_PARAMETERS = ['contain', 'cover', 'fill', 'inside', 'outside'];
const MAX_DATABASE_ARRAY_FIELD_LENGTH = 1e2;
const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_IMAGE_SIZE = 1e4;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

const Schema = mongoose.Schema;

const ImageSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  url_list: {
    type: Array,
    default: [],
    maxlength: MAX_DATABASE_ARRAY_FIELD_LENGTH
  },
  expiration_date: {
    type: Number,
    default: null
  }
});

ImageSchema.statics.createImage = function (data, callback) {
  const Image = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.file_name || typeof data.file_name != 'string' || !data.file_name.trim().length || data.file_name.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
    return callback('bad_request');

  if (data.name && typeof data.name == 'string')
    data.name = toImageURLString(data.name);
  else
    data.name = generateRandomImageName();

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

  uploadImages(data, (err, url_list) => {
    if (err) return callback('aws_database_error');

    const newImageData = {
      name: data.name,
      url_list
    };

    if (!data.is_used)
      newImageData.expiration_date = Date.now() + ONE_DAY_IN_MS;

    const newImage = new Image(newImageData);

    newImage.save((err, image) => {
      if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE) {
        Image.findOne({
          name: data.name
        }, (err, image) => {
          if (err) return callback('database_error');
          if (!image) return callback('document_not_found');

          const imagesToBeDeleted = [], imagesToBeKept = [];
          const existingImagePaths = [], uploadedImagePaths = [];

          for (let i = 0; i < image.url_list.length; i++) {
            getImagePathFromURL(image.url_list[i].url, (err, existingImagePath) => {
              if (err) return callback(err);

              existingImagePaths.push(existingImagePath);
            });
          };

          for (let i = 0; i < url_list.length; i++) {
            getImagePathFromURL(url_list[i].url, (err, uploadedImagePath) => {
              if (err) return callback(err);

              uploadedImagePaths.push(uploadedImagePath);
            });
          };

          const pathsToBeDeleted = existingImagePaths.filter(existingImagePath => !uploadedImagePaths.includes(existingImagePath));

          for (let i = 0; i < uploadedImagePaths.length; i++) {
            const imageIndex = uploadedImagePaths.indexOf(uploadedImagePaths[i]);

            imagesToBeKept.push(url_list[imageIndex]);
          };

          for (let i = 0; i < pathsToBeDeleted.length; i++) {
            const imageIndex = existingImagePaths.indexOf(pathsToBeDeleted[i]);

            imagesToBeDeleted.push(image.url_list[imageIndex]);
          };

          deleteImages(imagesToBeDeleted, err => {
            if (err) return callback(err);

            Image.findOneAndUpdate({
              name: data.name
            }, { $set: {
              url_list: imagesToBeKept
            }}, { new: true }, (err, image) => {
              if (err) return callback('database_error');
              if (!image) return callback('document_not_found');

              Image.findExpiredImagesAndDelete(err => {
                if (err) return callback(err);

                return callback(null, image.url_list);
              });
            });
          });
        });
      } else if (err) {
        return callback('database_error');
      } else {
        Image.findExpiredImagesAndDelete(err => {
          if (err) console.log(err);

          formatImage(image, (err, image) => {
            if (err) return callback(err);

            return callback(null, image.url_list);
          });
        });
      };
    });
  });
};

ImageSchema.statics.findImageById = function (id, callback) {
  const Image = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Image.findById(mongoose.Types.ObjectId(id.toString()), (err, image) => {
    if (err) return callback('database_error');
    if (!image) return callback('document_not_found');

    return callback(null, image);
  });
};

ImageSchema.statics.findImageByIdAndFormat = function (id, callback) {
  const Image = this;

  Image.findImageById(id, (err, image) => {
    if (err) return callback(err);

    formatImage(image, (err, image) => {
      if (err) return callback(err);

      return callback(null, image);
    });
  });
};

ImageSchema.statics.findImageByIdAndUpdate = function (id, data, callback) {
  const Image = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  if (!data || typeof data != 'object')
    return callback('bad_request');

  const updateData = {};

  if (data.name && typeof data.name == 'string' && data.name.trim().length && data.name.trim().length <= MAX_DATABASE_TEXT_FIELD_LENGTH)
    updateData.name = toImageURLString(data.name);

  if (data.is_used)
    updateData.expiration_date = null;

  if (!Object.keys(updateData).length)
    return callback('bad_request');

  Image.findByIdAndUpdate(mongoose.Types.ObjectId(id.toString()), { $set:
    updateData
  }, { new: false }, (err, image) => {
    if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
      return callback('duplicated_unique_field');

    if (err) return callback('database_error');

    if (!image) return callback('document_not_found');

    if (updateData.name != image.name) {
      const renameParameters = {
        name: updateData.name,
        url_list: image.url_list
      };

      renameImages(renameParameters, (err, url_list) => {
        if (err) return callback(err);

        Image.findByIdAndUpdate(mongoose.Types.ObjectId(id.toString()), { $set: {
          url_list
        }}, { new: true }, (err, image) => {
          if (err) return callback('database_error');

          formatImage(image, (err, image) => {
            if (err) return callback(err);

            return callback(null, image);
          });
        });
      });
    } else {
      formatImage(image, (err, image) => {
        if (err) return callback(err);

        return callback(null, image);
      });
    };
  });
};

ImageSchema.statics.findImageByIdAndRename = function (id, data, callback) {
  const Image = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.name || typeof data.name != 'string' || !data.name.trim().length || data.name.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
    return callback('bad_request');

  Image.findImageByIdAndUpdate(id, { name: data.name }, (err, image) => {
    if (err) return callback(err);

    return callback(null, image);
  });
};

ImageSchema.statics.findImageByIdAndSetAsUsed = function (id, callback) {
  const Image = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Image.findImageByIdAndUpdate(id, { is_used: true }, (err, image) => {
    if (err) return callback(err);

    return callback(null, image);
  });
};

ImageSchema.statics.findImageByIdAndDelete = function (id, callback) {
  const Image = this;

  Image.findImageById(id, (err, image) => {
    if (err) return callback(err);

    const urlList = image.url_list;

    deleteImages(urlList, err => {
      if (err) return callback(err);

      Image.findByIdAndDelete(id, err => {
        if (err) return callback('database_error');

        return callback(null);
      });
    });
  });
};

ImageSchema.statics.findExpiredImagesAndDelete = function (callback) {
  const Image = this;

  Image
    .find({
      expiration_date: { $lt: Date.now() }
    })
    .limit(EXPIRED_IMAGE_DELETION_LIMIT)
    .then(images => async.timesSeries(
      images.length,
      (time, next) => Image.findImageByIdAndDelete(images[time]._id, err => next(err)),
      err => {
        if (err) return callback(err);

        return callback(null);
      }
    ))
    .catch(_ => callback('database_error'));
};

module.exports = mongoose.model('Image', ImageSchema);