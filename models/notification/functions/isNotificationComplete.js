module.exports = notification => {
  return notification &&
  notification.title &&
  notification.message ? true : false;
};