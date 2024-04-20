const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const generateRandomHEX = require('../../utils/generateRandomHEX');
const toURLString = require('../../utils/toURLString');

const deleteImage = require('./function/deleteImage');
const formatImage = require('./function/formatImage');
const renameImage = require('./function/renameImage');
const uploadImage = require('./function/uploadImage');
const { find, findById } = require('./Image');

const EXPIRED_IMAGE_DELETION_LIMIT = 10;
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

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.file_name || typeof data.file_name != 'string' || !data.file_name.trim() || data.file_name.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
    return callback('bad_request');

  if (data.original_name && typeof data.original_name != 'string')
    data.original_name = toURLString(data.original_name);
  else
    data.original_name = generateRandomHEX(DEFAULT_IMAGE_RANDOM_NAME_LENGTH);

  if (!data.resize_parameters || !Array.isArray(data.resize_parameters) || !data.resize_parameters.length)
    return callback('bad_request');

  for (resize_parameter in data.resize_parameters) {
    if (!resize_parameter.fit)
      resize_parameter.fit = DEFAULT_FIT_PARAMETER;

    if (!FIT_PARAMETERS.includes(resize_parameter.fit))
      return callback('bad_request');

    resize_parameter.width = (!resize_parameter.width || isNaN(parseInt(resize_parameter.width)) || parseInt(resize_parameter.width) <= 0 || parseInt(resize_parameter.width) > MAX_IMAGE_SIZE) ? null : parseInt(resize_parameter.width);
    resize_parameter.height = (!resize_parameter.height || isNaN(parseInt(resize_parameter.height)) || parseInt(resize_parameter.height) <= 0 || parseInt(resize_parameter.height) > MAX_IMAGE_SIZE) ? null : parseInt(resize_parameter.height);

    if (!resize_parameter.width && !resize_parameter.height)
      return callback('bad_request');
  };

  uploadImage(data, (err, url_list) => {
    if (err) return callback('aws_database_error');

    const newImageData = {
      name: data.original_name,
      url_list
    };

    newImageData.is_used = !!data.is_used;
    // newImageData.is_used = data.is_used ? true : false;

    if (!data.is_used)
      newImageData.expiration_date = Date.now() + ONE_DAY_IN_MS;

    const newImage = new Image(newImageData);

    newImage.save((err, image) => {
      if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE) {
        Image.findOneAndUpdate({
          original_name: data.original_name
        }, { $set: {
          url_list: image.url_list
        }}, { new: true }, (err, image) => {
          if (err) return callback('database_error');

          Image.findExpiredImagesAndDelete(err => {
            if (err) console.log(err);

            formatImage(image, (err, image) => {
              if (err) return callback(err);

              return callback(null, image);
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

            return callback(null, image);
          });
        });
      };
    });

    // Image.findOne({
    //   name: data.original_name
    // }, (err, image) => {
    //   if (err) return callback('database_error');

    //   if (err || !image) {
    //     const newImageData = {
    //       name: data.original_name,
    //       url_list,
    //       expiration_date: Date.now() + ONE_DAY_IN_MS,
    //       is_used: data.is_used ? true : false
    //     };

    //     const newImage = new Image(newImageData);

    //     newImage.save((err, image) => {
    //       if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
    //         return callback('duplicated_unique_field');
    //       if (err) return callback('database_error');

    //       Image.findExpiredImagesAndDelete(err => {
    //         if (err) console.log(err);

    //         return callback(null, image);
    //       });
    //     });
    //   } else {
    //     Image.findByIdAndUpdate(image._id, { $set: {
    //       url_list: image.url_list.concat(url_list)
    //     }}, err => {
    //       if (err) return callback('database_error');

    //       Image.findExpiredImagesAndDelete(err => {
    //         if (err) console.log(err);

    //         return callback(null, image);
    //       });
    //     });
    //   };
    // });
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

  if (data.original_name && typeof data.original_name != 'string' && data.original_name.trim() && data.original_name.trim().length <= MAX_DATABASE_TEXT_FIELD_LENGTH)
    updateData.original_name = data.original_name;

  if (data.is_used)
    updateData.is_used = true;

  if (!Object.keys(updateData).length)
    return callback('bad_request');

  Image.findByIdAndUpdate(mongoose.Types.ObjectId(id.toString()), { $set:
    updateData
  }, { new: true }, (err, image) => {
    if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
      return callback('duplicated_unique_field');

    if (err) return callback('database_error');

    if (!image) return callback('document_not_found');

    if (updateData.original_name) {
      renameImage(image, (err, url_list) => {
        if (err) return callback(err);

        findByIdAndUpdate(mongoose.Types.ObjectId(id.toString()), { $set: {
          url_list
        }}, { new: true }, (err, image) => {
          if (err) return callback('database_error');

          formatImage(image, (err, image) => {
            if (err) return callback(err);

            return callback(null, image);
          });
        });
        // image.url_list = url_list;

        // image.save((err, image) => {
        //   if (err) return callback('database_error');

        //   formatImage(image, (err, image) => {
        //     if (err) return callback(err);

        //     return callback(null, image);
        //   });
        // });
      });
    };

    formatImage(image, (err, image) => {
      if (err) return callback(err);

      return callback(null, image);
    });
  });
};

ImageSchema.statics.findImageByIdAndRename = function (id, data, callback) {
  const Image = this;

  Image.findImageByIdAndUpdate(id, data, (err, image) => {
    if (err) return callback(err);

    return callback(null, image);
  });
};

ImageSchema.statics.findImageByIdAndSetAsUsed = function (id, callback) {
  const Image = this;

  Image.findImageByIdAndUpdate(id, { is_used: true }, (err, image) => {
    if (err) return callback(err);

    return callback(null, image);
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
    .limit(EXPIRED_IMAGE_DELETION_LIMIT)
    .then(images => async.timesSeries(
      images.length,
      (time, next) => Image.findImageByIdAndDelete(images[time]._id, err => next(err)),
      err => {
        if (err) return callback(err);

        return callback(null);
      }
    ))
    .catch(err =>
      callback(err)
    );
};

module.exports = mongoose.model('Image', ImageSchema);