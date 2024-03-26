module.exports = (req, res) => {
  return res.render('index/index', {
    page: 'index/index',
    title: res.__('Admin Dashboard'),
    includes: {
      external: {
        css: ['confirm', 'form', 'formPopUp', 'general', 'header', 'items', 'navbar', 'navigation', 'text'],
        js: ['createConfirm', 'createFormPopUp', 'navbarListeners', 'page', 'serverRequest']
      }
    }
  });
};
