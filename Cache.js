let notificationCache = null;
let projectCache = null;

module.exports = {
  get: (key) => {
    if (key == 'notifications')
      return notificationCache;
    else if (key == 'projects')
      return projectCache;
    else
      return null;
  },
  set: (key, value) => {
    if (key == 'notifications')
      notificationCache = {
        time: Date.now(),
        data: value
      };
    else if (key == 'projects')
      projectCache = {
        time: Date.now(),
        data: value
      };
  }
};