const fs = require('fs');
const path = require('path');

module.exports = (req, res, next) => {
  if (req.session.ADMIN_PASSWORD && req.session.ADMIN_PASSWORD == process.env.ADMIN_PASSWORD)
    return next();

  if (req.file && req.file.filename)
    return fs.unlink(path.join(__dirname, '../models/image/uploads/' + req.file.filename), () => {
      return res.status(401).redirect('/admin/login');
    });

  return res.status(401).redirect('/admin/login');
};
