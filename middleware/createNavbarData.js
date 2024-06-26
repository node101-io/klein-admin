module.exports = (req, res, next) => {
  const allMenuData = {
    'Notifications': [
      { name: res.__('All Notifications'), link: '/notification' },
      { name: res.__('Published Notifications'), link: '/notification/publish' },
      { name: res.__('New Notification'), link: '/notification/create' },
      { name: res.__('Deleted Notifications'), link: '/notification/delete' }
    ],
    'Projects': [
      { name: res.__('All Projects'), link: '/project' },
      { name: res.__('New Project'), link: '/project/create' },
      { name: res.__('Deleted Projects'), link: '/project/delete' }
    ]
  };

  const route = req.originalUrl.split('?')[0];
  const menu = {};

  Object.keys(allMenuData).forEach(key => {
    allMenuData[key].forEach(page => {
      if (!menu[key])
        menu[key] = [];

      const newPage = {
        name: page.name,
        link: page.link
      };

      if (page.link == route)
        newPage.selected = true;

      menu[key].push(newPage);
    });
  });

  res.locals.navbar = {
    title: res.__('Klein Admin'),
    subtitle: res.__('Manage everything about Klein.'),
    logout: 'admin/logout',
    menu
  };

  return next();
};