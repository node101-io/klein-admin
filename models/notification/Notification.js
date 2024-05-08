const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const formatTranslations = require('./functions/formatTranslations');
const getNotification = require('./functions/getNotification');
const getNotificationByLanguage = require('./functions/getNotificationByLanguage');
const isNotificationComplete = require('./functions/isNotificationComplete');

const DEFAULT_DOCUMENT_COUNT_PER_QUERY = 20;
const DUPLICATED_UNIQUE_FIELD_ERROR_CODE = 11000;
const MAX_DATABASE_LONG_TEXT_FIELD_LENGTH = 1e5;
const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_DOCUMENT_COUNT_PER_QUERY = 1e2;

const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  message: {
    type: String,
    default: null,
    trim: true,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  publish_date: {
    type: Date,
    default: null
  },
  will_be_published: {
    type: Boolean,
    default: false
  },
  is_published: {
    type: Boolean,
    default: false
  },
  is_completed: {
    type: Boolean,
    default: false
  },
  is_deleted: {
    type: Boolean,
    default: false
  },
  translations: {
    type: Object,
    default: {}
  },
  search_title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_DATABASE_LONG_TEXT_FIELD_LENGTH
  },
  search_message: {
    type: String,
    default: null,
    trim: true,
    maxlength: MAX_DATABASE_LONG_TEXT_FIELD_LENGTH
  }
});

NotificationSchema.statics.createNotification = function (data, callback) {
  const Notification = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.title || typeof data.title != 'string' || !data.title.trim().length || data.title.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
    return callback('bad_request');

  const newNotificationData = {
    title: data.title.trim(),
    search_title: data.title.trim().toLowerCase()
  };

  const newNotification = new Notification(newNotificationData);

  newNotification.save((err, notification) => {
    if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
      return callback('duplicated_unique_field');

    if (err) return callback('database_error');

    notification.translations = formatTranslations(notification, 'tr');

    Notification.findByIdAndUpdate(notification._id, { $set: {
      translations: notification.translations
    }}, err => {
      if (err) return callback('database_error');

      Notification.collection
        .createIndex(
          { search_title: 'text', search_message: 'text' },
          { weights: {
            search_title: 10,
            search_message: 1
          }}
        )
        .then(() => callback(null, notification._id.toString()))
        .catch(_ => callback('index_error'));
    });
  });
};

NotificationSchema.statics.findNotificationById = function (id, callback) {
  const Notification = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Notification.findById(mongoose.Types.ObjectId(id.toString()), (err, notification) => {
    if (err) return callback('database_error');

    if (!notification) return callback('document_not_found');

    const is_completed = isNotificationComplete(notification);

    if (notification.is_completed == is_completed)
      return callback(null, notification);

    Notification.findByIdAndUpdate(notification._id, { $set: {
      is_completed
    }}, { new: true }, (err, notification) => {
      if (err) return callback('database_error');

      return callback(null, notification);
    });
  });
};

NotificationSchema.statics.findNotificationByIdAndFormat = function (id, callback) {
  const Notification = this;

  Notification.findNotificationById(id, (err, notification) => {
    if (err) return callback(err);

    getNotification(notification, (err, notification) => {
      if (err) return callback(err);

      return callback(null, notification);
    });
  });
};

NotificationSchema.statics.findNotificationByIdAndFormatByLanguage = function (id, language, callback) {
  const Notification = this;

  if (!language || !validator.isISO31661Alpha2(language.toString()))
    return callback('bad_request');

  Notification.findNotificationById(id, (err, notification) => {
    if (err) return callback(err);

    if (!notification.is_completed)
      return callback('not_authenticated_request');

    getNotificationByLanguage(notification, language, (err, notification) => {
      if (err) return callback(err);

      return callback(null, notification);
    });
  });
};

NotificationSchema.statics.findNotificationByIdAndUpdate = function (id, data, callback) {
  const Notification = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  const updateData = {};

  if (data.title && typeof data.title == 'string' && data.title.trim() && data.title.trim().length <= MAX_DATABASE_TEXT_FIELD_LENGTH)
    updateData.title = data.title.trim();

  if (data.message && typeof data.message == 'string' && data.message.trim() && data.message.trim().length <= MAX_DATABASE_TEXT_FIELD_LENGTH)
    updateData.message = data.message.trim();

  if (data.publish_date && typeof data.publish_date == 'string' && !isNaN(new Date(data.publish_date)))
    updateData.publish_date = new Date(data.publish_date);

  if (!Object.keys(updateData).length)
    return callback('bad_request');

  Notification.findNotificationById(id, (err, notification) => {
    if (err) return callback(err);
    if (notification.is_deleted) return callback('not_authenticated_request');

    if (new Date(notification.publish_date) != new Date(updateData.publish_date)) {
      updateData.will_be_published = false;

      Notification.findByIdAndUpdate(notification._id, { $set:
        updateData
      }, { new: true }, (err, notification) => {
        if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
          return callback('duplicated_unique_field');

        if (err) return callback('database_error');

        notification.translations = formatTranslations(notification, 'tr', notification.translations.tr);

        Notification.findByIdAndUpdate(notification._id, { $set: {
          translations: notification.translations
        }}, { new: true }, (err, notification) => {
          if (err) return callback('database_error');

          const searchTitle = new Set();
          const searchMessage = new Set();

          notification.title.split(' ').forEach(word => searchTitle.add(word));
          notification.translations.tr.title.split(' ').forEach(word => searchTitle.add(word));

          notification.message.split(' ').forEach(word => searchMessage.add(word));
          notification.translations.tr.message.split(' ').forEach(word => searchMessage.add(word));

          Notification.findByIdAndUpdate(notification._id, { $set: {
            search_title: Array.from(searchTitle).join(' '),
            search_message: Array.from(searchMessage).join(' ')
          }}, { new: true }, err => {
            if (err) return callback('database_error');

            Notification.collection
              .createIndex(
                { search_title: 'text', search_message: 'text' },
                { weights: {
                  search_title: 10,
                  search_message: 1
                }}
              )
              .then(() => callback(null))
              .catch(_ => callback('index_error'));
          });
        });
      });
    } else if (new Date(notification.publish_date) == new Date(updateData.publish_date)) {
      Notification.findByIdAndUpdate(notification._id, { $set:
        updateData
      }, { new: true }, (err, notification) => {
        if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
          return callback('duplicated_unique_field');

        if (err) return callback('database_error');

        notification.translations = formatTranslations(notification, 'tr', notification.translations.tr);

        Notification.findByIdAndUpdate(notification._id, { $set: {
          translations: notification.translations
        }}, { new: true }, (err, notification) => {
          if (err) return callback('database_error');

          const searchTitle = new Set();
          const searchMessage = new Set();

          notification.title.split(' ').forEach(word => searchTitle.add(word));
          notification.translations.tr.title.split(' ').forEach(word => searchTitle.add(word));

          notification.message.split(' ').forEach(word => searchMessage.add(word));
          notification.translations.tr.message.split(' ').forEach(word => searchMessage.add(word));

          Notification.findByIdAndUpdate(notification._id, { $set: {
            search_title: Array.from(searchTitle).join(' '),
            search_message: Array.from(searchMessage).join(' ')
          }}, { new: true }, err => {
            if (err) return callback('database_error');

            Notification.collection
              .createIndex(
                { search_title: 'text', search_message: 'text' },
                { weights: {
                  search_title: 10,
                  search_message: 1
                }}
              )
              .then(() => callback(null))
              .catch(_ => callback('index_error'));
          });
        });
      });
    } else {
      return callback('bad_request');
    };
  });
};

NotificationSchema.statics.findNotificationByIdAndUpdateTranslations = function (id, data, callback) {
  const Notification = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.language || !validator.isISO31661Alpha2(data.language.toString()))
    return callback('bad_request');

  Notification.findNotificationById(id, (err, notification) => {
    if (err) return callback(err);

    if (!notification.is_completed)
      return callback('not_authenticated_request');

    const translations = formatTranslations(notification, data.language, data);

    Notification.findByIdAndUpdate(notification._id, { $set: {
      translations
    }}, { new: true }, (err, notification) => {
      if (err) return callback('database_error');

      const searchTitle = new Set();
      const searchMessage = new Set();

      notification.title.split(' ').forEach(word => searchTitle.add(word));
      notification.translations.tr.title.split(' ').forEach(word => searchTitle.add(word));

      notification.message.split(' ').forEach(word => searchMessage.add(word));
      notification.translations.tr.message.split(' ').forEach(word => searchMessage.add(word));

      Notification.findByIdAndUpdate(notification._id, { $set: {
        search_title: Array.from(searchTitle).join(' '),
        search_message: Array.from(searchMessage).join(' ')
      }}, err => {
        if (err) return callback('database_error');

        Notification.collection
          .createIndex(
            { search_title: 'text', search_message: 'text' },
            { weights: {
              search_title: 10,
              search_message: 1
            }}
          )
          .then(() => callback(null))
          .catch(_ => callback('index_error'));
      });
    });
  });
};

NotificationSchema.statics.findNotificationsByFilters = function (data, callback) {
  const Notification = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  const filters = {};

  const limit = data.limit && !isNaN(parseInt(data.limit)) && parseInt(data.limit) > 0 && parseInt(data.limit) < MAX_DOCUMENT_COUNT_PER_QUERY ? parseInt(data.limit) : DEFAULT_DOCUMENT_COUNT_PER_QUERY;
  const page = data.page && !isNaN(parseInt(data.page)) && parseInt(data.page) > 0 ? parseInt(data.page) : 0;
  const skip = page * limit;

  if ('is_deleted' in data)
    filters.is_deleted = data.is_deleted ? true : false;

  if ('is_published' in data)
    filters.is_published = data.is_published ? true : false;

  if (data.title && typeof data.title == 'string' && data.title.trim().length && data.title.trim().length < MAX_DATABASE_LONG_TEXT_FIELD_LENGTH)
    filters.title = { $regex: data.title.trim(), $options: 'i' };

  if (data.publish_date && typeof data.publish_date == 'string' && !isNaN(new Date(data.publish_date)))
    filters.publish_date = { $lte: new Date(data.publish_date) };

  if (!data.search || typeof data.search != 'string' || !data.search.trim().length) {
    Notification
      .find(filters)
      .sort({
        is_completed: 1,
        publish_date: -1,
        is_published: 1
      })
      .limit(limit)
      .skip(skip)
      .then(notifications => async.timesSeries(
        notifications.length,
        (time, next) => Notification.findNotificationByIdAndFormat(notifications[time]._id, (err, notification) => next(err, notification)),
        (err, notifications) => {
          if (err) return callback(err);

          return callback(null, {
            search: null,
            limit,
            page,
            notifications
          });
        })
      )
      .catch(_ => callback('database_error'));
  } else {
    filters.$text = { $search: data.search.trim() };

    Notification
      .find(filters)
      .sort({
        is_completed: 1,
        publish_date: -1,
        is_published: 1
      })
      .limit(limit)
      .skip(skip)
      .then(notifications => async.timesSeries(
        notifications.length,
        (time, next) => Notification.findNotificationByIdAndFormat(notifications[time]._id, (err, notification) => next(err, notification)),
        (err, notifications) => {
          if (err) return callback(err);

          return callback(null, {
            search: data.search.trim(),
            limit,
            page,
            notifications
          });
        })
      )
      .catch(_ => callback('database_error'));
  };
};

NotificationSchema.statics.findNotificationCountByFilters = function (data, callback) {
  const Notification = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  const filters = {};

  if ('is_deleted' in data)
    filters.is_deleted = data.is_deleted ? true : false;

  if ('is_published' in data)
    filters.is_published = data.is_published ? true : false;

  if (data.title && typeof data.title == 'string' && data.title.trim().length && data.title.trim().length < MAX_DATABASE_LONG_TEXT_FIELD_LENGTH)
    filters.title = { $regex: data.title.trim(), $options: 'i' };

  if (data.publish_date && typeof data.publish_date == 'string' && !isNaN(new Date(data.publish_date)))
    filters.publish_date = { $lte: new Date(data.publish_date) };

  if (!data.search || typeof data.search != 'string' || !data.search.trim().length) {
    Notification
      .countDocuments(filters)
      .then(count => callback(null, count))
      .catch(_ => callback('database_error'));
  } else {
    filters.$text = { $search: data.search.trim() };

    Notification
      .countDocuments(filters)
      .then(count => callback(null, count))
      .catch(_ => callback('database_error'));
  };
};

NotificationSchema.statics.findNotificationByIdAndPublish = function (id, callback) {
  const Notification = this;

  Notification.findNotificationById(id, (err, notification) => {
    if (err) return callback(err);
    if (notification.is_deleted) return callback(null);
    if (notification.is_published) return callback(null);

    Notification.findByIdAndUpdate(notification._id, { $set: {
      publish_date: Date.now(),
      is_published: true,
      will_be_published: false
    }}, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

NotificationSchema.statics.findNotificationByIdAndSchedule = function (id, callback) {
  const Notification = this;

  Notification.findNotificationById(id, (err, notification) => {
    if (err) return callback(err);
    if (notification.is_deleted) return callback(null);
    if (notification.is_published) return callback(null);

    Notification.findByIdAndUpdate(notification._id, { $set: {
      will_be_published: true
    }}, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

NotificationSchema.statics.findNotificationByIdAndDelete = function (id, callback) {
  const Notification = this;

  Notification.findNotificationById(id, (err, notification) => {
    if (err) return callback(err);
    if (notification.is_deleted) return callback(null);

    Notification.findByIdAndUpdate(notification._id, { $set: {
      is_deleted: true
    }}, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

NotificationSchema.statics.findNotificationByIdAndRestore = function (id, callback) {
  const Notification = this;

  Notification.findNotificationById(id, (err, notification) => {
    if (err) return callback(err);
    if (!notification.is_deleted) return callback(null);

    Notification.findByIdAndUpdate(notification._id, { $set: {
      is_deleted: false
    }}, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

module.exports = mongoose.model('Notification', NotificationSchema);