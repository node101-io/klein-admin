const Notification = require('../../../models/notification/Notification');

const TEN_SECONDS_IN_MS = 10 * 1000;

let lastRequestTime = 0;
let lastRequestResponse = null;

module.exports = (req, res) => {
  console.log(lastRequestTime, 'in')
  if (lastRequestTime > Date.now() - TEN_SECONDS_IN_MS)
    return res.json(lastRequestResponse);
  console.log(lastRequestTime, 'out')
  lastRequestTime = Date.now();

  const filters = {
    is_deleted: false,
    is_published: true
  };

  Notification.findNotificationsByFilters(filters, (err, data) => {
    if (err) return res.json({
      success: false,
      error: err
    });

    lastRequestResponse = {
      success: true,
      notifications: data.notifications
    };

    return res.json(lastRequestResponse);
  });
};