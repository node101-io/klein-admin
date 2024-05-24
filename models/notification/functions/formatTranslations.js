const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;

module.exports = (notification, language, data) => {
  if (!data)
    data = {};

  const translations = JSON.parse(JSON.stringify(notification.translations));

  translations[language.toString().trim()] = {
    title: data.title && typeof data.title == 'string' && data.title.trim().length && data.title.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH ? data.title.trim() : notification.title,
    message: data.message && typeof data.message == 'string' && data.message.trim().length && data.message.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH ? data.message.trim() : notification.message,
  };

  return translations;
};