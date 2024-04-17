const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const generateRandomHEX = require('../../utils/generateRandomHEX');
const toURLString = require('../../utils/toURLString');

// const copyImage = require('./functions/copyImage');
const deleteImage = require('./function/deleteImage');
const uploadImage = require('./function/uploadImage');
const getImage = require('./function/getImage');

const DEFAULT_EXPIRED_IMAGE_DELETION_LIMIT = 10;
const DEFAULT_IMAGE_RANDOM_NAME_LENGTH = 32;
const DEFAULT_FIT_PARAMETER = 'cover';
const DUPLICATED_UNIQUE_FIELD_ERROR_CODE = 11000;
const MAX_DATABASE_ARRAY_FIELD_LENGTH = 1e4;
const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_IMAGE_SIZE = 1e4;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const FIT_PARAMETERS = ['cover', 'contain', 'fill', 'inside', 'outside'];

const Schema = mongoose.Schema;

const ImageSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH,
    trim: true
  },
  url_list: {
    type: Array,
    default: [],
    maxlength: MAX_DATABASE_ARRAY_FIELD_LENGTH
  },
  is_used: {
    type: Boolean,
    default: false
  },
  // delete_uploaded_file: {
  //   type: Boolean,
  //   default: false
  // },
  expiration_date: {
    type: Number,
    required: true
  }
});

ImageSchema.statics.createImage = function (data, callback) {
  const Image = this;

  if (!data.file_name)
    return callback('bad_request');

  data.original_name = (!data.original_name || typeof data.original_name != 'string') ? generateRandomHEX(DEFAULT_IMAGE_RANDOM_NAME_LENGTH) : toURLString(data.original_name);

  if (!data.resize_parameters || !Array.isArray(data.resize_parameters) || data.resize_parameters.length == 0)
    return callback('bad_request');

  for (let i = 0; i < data.resize_parameters.length; i++) {
    const resize_parameter = data.resize_parameters[i];

    if (!FIT_PARAMETERS.includes(resize_parameter.fit))
      return callback('bad_request');

    if (!resize_parameter.width && !resize_parameter.height)
      return callback('bad_request');

    if (!resize_parameter.fit)
      resize_parameter.fit = DEFAULT_FIT_PARAMETER;

    resize_parameter.width = (!resize_parameter.width || isNaN(parseInt(resize_parameter.width)) || parseInt(resize_parameter.width) <= 0 || parseInt(resize_parameter.width) > MAX_IMAGE_SIZE) ? null : parseInt(resize_parameter.width);
    resize_parameter.height = (!resize_parameter.height || isNaN(parseInt(resize_parameter.height)) || parseInt(resize_parameter.height) <= 0 || parseInt(resize_parameter.height) > MAX_IMAGE_SIZE) ? null : parseInt(resize_parameter.height);
  };

  uploadImage(data, (err, url_list) => {
    if (err) return callback('aws_database_error');

    Image.findOne({
      name: data.original_name
    }, (err, image) => {
      if (err) return callback('database_error');

      if (err | !image) {
        const newImageData = {
          name: data.original_name,
          url_list,
          expiration_date: Date.now() + ONE_DAY_IN_MS,
          is_used: data.is_used ? true : false
        };

        const newImage = new Image(newImageData);

        newImage.save((err, image) => {
          if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
            return callback('duplicated_name');
          if (err) return callback('database_error');

          Image.findExpiredImagesAndDelete(err => {
            if (err) console.log(err);

            return callback(null, image);
          });
        });
      } else {
        Image.findByIdAndUpdate(image._id, { $set: {
          url_list: image.url_list.concat(url_list)
        }}, err => {
          if (err) return callback('database_error');

          Image.findExpiredImagesAndDelete(err => {
            if (err) console.log(err);

            return callback(null, image);
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

// ImageSchema.statics.findImageByUrlList = function (url_list, callback) { // yunus'a sor
//   const Image = this;

//   if (!url_list || !Array.isArray(url_list) || url_list.length == 0)
//     return callback('bad_request');

//   Image.findOne({
//     url_list: url_list
//   }, (err, image) => {
//     if (err) return callback('database_error');
//     if (!image) return callback('document_not_found');

//     return callback(null, image);
//   });
// };

// ImageSchema.statics.findImageByUrl = function (url, callback) {
//   const Image = this;

//   if (!url || typeof url != 'string')
//     return callback('bad_request');

//   Image.findOne({
//     'url_list.url': url.trim()
//   }, (err, image) => {
//     if (err) return callback('database_error');
//     if (!image) return callback('document_not_found');

//     return callback(null, image);
//   });
// };

ImageSchema.statics.findImageByIdAndFormat = function (id, callback) {
  const Image = this;

  Image.findImageById(id, (err, image) => {
    if (err) return callback(err);

    getImage(image, (err, formattedImage) => {
      if (err) return callback(err);

      return callback(null, formattedImage);
    });
  });
};

ImageSchema.statics.findImageByIdAndDelete = function (id, callback) {
  const Image = this;

  Image.findImageById(id, (err, image) => {
    if (err) return callback(err);

    async.timesSeries(
      image.url_list.length,
      (time, next) => deleteImage(image.url_list[time], err => next(err)),
      err => {
        if (err) return callback(err);

        Image.findByIdAndDelete(mongoose.Types.ObjectId(id.toString()), err => {
          if (err) return callback('database_error');

          return callback(null);
        });
      }
    );
  });
};

ImageSchema.statics.findExpiredImagesAndDelete = function (callback) {
  const Image = this;

  Image
    .find({
      is_used: false,
      expiration_date: { $lt: Date.now() }
    })
    .limit(DEFAULT_EXPIRED_IMAGE_DELETION_LIMIT)
    .then(images => async.timesSeries(
      images.length,
      (time, next) => Image.findImageByIdAndDelete(images[time]._id, err => next(err)),
      err => {
        if (err) return callback(err);

        return callback(null);
      }
    ))
    .catch(err => {
      return callback(err);
    });
};

ImageSchema.statics.findImageByIdAndSetAsUsed = function (id, callback) {
  const Image = this;

  Image.findImageById(id, (err, image) => {
    if (err) return callback(err);

    if (image.is_used) return callback(null);

    Image.findByIdAndUpdate(mongoose.Types.ObjectId(id.toString()), { $set: {
      is_used: true
    }}, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

module.exports = mongoose.model('Image', ImageSchema);