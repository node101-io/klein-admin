const Notification = require('../../../models/notification/Notification');

module.exports = (req, res) => {
  Notification.findNotificationByIdAndFormat(req.query.id, (err, notification) => {
    if (err) return res.redirect('/error?message=' + err);

    return res.render('notification/edit', {
      page: 'notification/edit',
      title: notification.title,
      includes: {
        external: {
          css: ['confirm', 'create', 'form', 'formPopUp', 'general', 'header', 'items', 'navbar', 'navigation', 'text'],
          js: ['ancestorWithClassName', 'createConfirm', 'createFormPopUp', 'form', 'navbarListeners', 'page', 'serverRequest']
        }
      },
      notification
    });
  });
};