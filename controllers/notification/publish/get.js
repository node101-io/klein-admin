const Notification = require('../../../models/notification/Notification');

module.exports = (req, res) => {
  req.query.is_published = true;

  Notification.findNotificationCountByFilters(req.query, (err, count) => {
    if (err) return res.redirect('/error?message=' + err);

    Notification.findNotificationsByFilters(req.query, (err, data) => {
      if (err) return res.redirect('/error?message=' + err);

      return res.render('notification/publish', {
        page: 'notification/publish',
        title: res.__('Published Notifications'),
        includes: {
          external: {
            css: ['confirm', 'form', 'formPopUp', 'general', 'header', 'items', 'navbar', 'navigation', 'text'],
            js: ['createConfirm', 'createFormPopUp', 'navbarListeners', 'page', 'serverRequest']
          }
        },
        notifications_count: count,
        notifications_search: data.search,
        notifications_limit: data.limit,
        notifications_page: data.page,
        notifications: data.notifications
      });
    });
  });
};