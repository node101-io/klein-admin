const Cache = require('../../../Cache');
const Notification = require('../../../models/notification/Notification');

module.exports = (req, res) => {
  const cachedNotifications = Cache.get('notifications');

  if (cachedNotifications && cachedNotifications.data)
    return res.json(cachedNotifications.data);

  Notification.findNotificationsByFilters({
    is_deleted: false,
    is_published: true
  }, (err, data) => {
    if (err) return res.json({
      success: false,
      error: err
    });

    const response = {
      success: true,
      notifications: data.notifications
    };

    if (JSON.stringify(cachedNotifications) == JSON.stringify(Cache.get('notifications')))
      Cache.set('notifications', response);

    return res.json(response);
  });
};