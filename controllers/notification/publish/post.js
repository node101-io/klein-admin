const Notification = require('../../../models/notification/Notification');

module.exports = (req, res) => {
  Notification.findNotificationByIdAndPublish(req.body.id, err => {
    if (err) {
      res.write(JSON.stringify({ success: false, error: err }));
      return res.end();
    };

    res.write(JSON.stringify({ success: true }));
    return res.end();
  });
};