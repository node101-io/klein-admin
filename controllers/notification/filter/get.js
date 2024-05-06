const Notification = require('../../../models/notification/Notification');

module.exports = (req, res) => {
  req.query.is_deleted = false;

  Notification.findNotificationsByFilters(req.query, (err, data) => {
    if (err) {
      res.write(JSON.stringify({ success: false, error: err }));
      return res.end();
    };

    res.write(JSON.stringify({ success: true, notifications: data.notifications }));
    return res.end();
  });
};