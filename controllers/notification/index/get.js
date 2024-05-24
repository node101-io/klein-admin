const Notification = require('../../../models/notification/Notification');

module.exports = (req, res) => {
  req.query.is_deleted = false;
  req.query.is_published = false;

  Notification.findNotificationCountByFilters(req.query, (err, count) => {
    if (err) return res.redirect('/error?message=' + err);

    Notification.findNotificationsByFilters(req.query, (err, data) => {
      if (err) return res.redirect('/error?message=' + err);

      return res.render('notification/index', {
        page: 'notification/index',
        title: res.__('Notifications'),
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