module.exports = (notification, language, callback) => {
  let translation = notification.translations[language];

  if (!translation)
    translation = {
      title: notification.title,
      message: notification.message
    };

  return callback(null, {
    _id: notification._id.toString(),
    title: translation.title,
    message: translation.message,
    publish_date: notification.publish_date,
    is_completed: notification.is_completed,
    is_published: notification.is_published,
    will_be_published: notification.will_be_published
  });
};