const Notification = require('../../../models/notification/Notification');

module.exports = (req, res) => {
  Notification.createNotification(req.body, (err, id) => {
    if (err) {
      res.write(JSON.stringify({ success: false, error: err }));
      return res.end();
    };

    res.write(JSON.stringify({ success: true, id}));
    return res.end();
  });
};