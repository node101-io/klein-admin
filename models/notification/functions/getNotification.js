module.exports = (notification, callback) => {
  if (!notification || !notification._id)
    return callback('document_not_found');

  return callback(null, {
    _id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    publish_date: notification.publish_date,
    translations: notification.translations,
    is_completed: notification.is_completed,
    is_published: notification.is_published,
    will_be_published: notification.will_be_published
  });
};