const mongoose = require('mongoose');

const { isMongoId } = require('validator');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Notification = require('../models/notification/Notification');

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Notification Model - Methods Testing', () => {
  let notificationId;

  it('should create a new notification with given title, and return a valid MongoDB ObjectId', done => {
    Notification.createNotification({
      title: 'Test Notification',
      description: 'Test Notification Description'
    }, (err, id) => {
      expect(err).toBeNull();
      expect(isMongoId(id.toString())).toBe(true);

      notificationId = id;

      done();
    });
  });

  it('should find the notification with the given id', done => {
    Notification.findNotificationById(notificationId, (err, notification) => {
      expect(err).toBeNull();
      expect(notification._id.toString()).toBe(notificationId.toString());

      done();
    });
  });

  it('should find the notification with the given id and format its response', done => {
    Notification.findNotificationByIdAndFormat(notificationId, (err, notification) => {
      expect(err).toBeNull();
      expect(notification._id.toString()).toBe(notificationId.toString());

      done();
    });
  });

  it('should find the notification with the given id and update it with the new data', done => {
    Notification.findNotificationByIdAndUpdate(notificationId, {
      title: 'Updated Test Notification',
      message: 'Updated Test Notification Message',
      publish_date: '2021-01-01'
    }, (err) => {
      expect(err).toBeNull();

      Notification.findNotificationById(notificationId, (err, updatedNotification) => {
        expect(err).toBeNull();
        expect(updatedNotification.title).toBe('Updated Test Notification');
        expect(updatedNotification.message).toBe('Updated Test Notification Message');
      });

      done();
    });
  });

  it('should find the notification with the given id and update its translations', done => {
    Notification.findNotificationByIdAndUpdateTranslations(notificationId, {
      language: 'tr',
      title: 'Test Bildirim',
      message: 'Test Bildirim Mesajı'
    }, (err) => {
      expect(err).toBeNull();

      Notification.findNotificationById(notificationId, (err, updatedNotification) => {
        expect(err).toBeNull();
        expect(updatedNotification.translations.tr.title).toBe('Test Bildirim');
        expect(updatedNotification.translations.tr.message).toBe('Test Bildirim Mesajı');

        done();
      });
    });
  });

  it('should find the notification with the given id and format it by language', done => {
    Notification.findNotificationByIdAndFormatByLanguage(notificationId, 'tr', (err, notification) => {
      expect(err).toBeNull();
      expect(notification._id.toString()).toBe(notificationId.toString());

      done();
    });
  });

  it('should find the notifications with the given filters', done => {
    Notification.findNotificationsByFilters({
      title: 'Updated Test Notification'
    }, (err, notifications_data) => {
      expect(err).toBeNull();
      expect(notifications_data.notifications[0]._id.toString()).toBe(notificationId.toString());

      done();
    });
  });

  it('should find the notifications count with the given filters', done => {
    Notification.findNotificationCountByFilters({
      title: 'Updated Test Notification'
    }, (err, count) => {
      expect(err).toBeNull();
      expect(count).toBe(1);

      done();
    });
  });

  it('should find the notification with the given id and schedule it', done => {
    Notification.findNotificationByIdAndSchedule(notificationId, (err) => {
      expect(err).toBeNull();

      Notification.findNotificationById(notificationId, (err, notification) => {
        expect(err).toBeNull();
        expect(notification.will_be_published).toBe(true);

        done();
      });
    });
  });

  it('should find the notification with the given id and publish it', done => {
    Notification.findNotificationByIdAndPublish(notificationId, (err) => {
      expect(err).toBeNull();

      Notification.findNotificationById(notificationId, (err, notification) => {
        expect(err).toBeNull();
        expect(notification.is_published).toBe(true);

        done();
      });
    });
  });

  it('should find the notification with the given id and delete it', done => {
    Notification.findNotificationByIdAndDelete(notificationId, err => {
      expect(err).toBeNull();

      Notification.findNotificationById(notificationId, (err, notification) => {
        expect(err).toBeNull();
        expect(notification.is_deleted).toBe(true);

        done();
      });
    });
  });

  it('should find the notification with the given id and restore it', done => {
    Notification.findNotificationByIdAndRestore(notificationId, err => {
      expect(err).toBeNull();

      Notification.findNotificationById(notificationId, (err, notification) => {
        expect(err).toBeNull();
        expect(notification.is_deleted).toBe(false);

        done();
      });
    });
  });
});