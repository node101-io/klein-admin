const fs = require('fs');

module.exports = (file, callback) => {
  if (!file || !file.filename)
    return callback('bad_request');

  fs.unlink('./models/image/uploads/' + file.filename, err => {
    if (err) return callback('fs_unlink_error');

    return callback(null);
  });
};
