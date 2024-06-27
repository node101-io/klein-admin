const fs = require('fs');
const path = require('path');

module.exports = (file, callback) => {
  if (!file || !file.filename)
    return callback('bad_request');

  fs.unlink(path.join(__dirname, '/image/uploads/' + file.filename), err => {
    if (err) return callback('fs_unlink_error');

    return callback(null);
  });
};