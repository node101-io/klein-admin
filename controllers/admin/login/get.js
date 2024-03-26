module.exports = (req, res) => {
  return res.render('admin/login', {
    page: 'admin/login',
    title: res.__('Klein Admin Log In'),
    includes: {
      external: {
        css: ['form', 'general', 'page', 'text'],
        js: ['page', 'serverRequest']
      }
    }
  });
};
