const Notification = require('../../../models/notification/Notification');

let lastRequestTime = 0;
let lastRequestResponse = null;

module.exports = (req, res) => {
  // if (lastRequestTime > Date.now() - 10 * 1000)
  //   return res.json(lastRequestResponse);

  // lastRequestTime = Date.now();

  // filters {}
  // is deleted ve is published

  Notification.findNotificationsByFilters(filters, (err, notifications) => {
    if (err) return res.json({
    });

    // lastRequestResponse = notifications;

    return res.json({
      // success: true,
      // Notifications: data.Notifications,
      // count,
      // limit: data.limit, // 20 olsun
      // page: data.page,
      // search: data.search
    });
  });
};