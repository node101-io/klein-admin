const MAX_IMAGE_SIZE = 1e4;

module.exports = (data, callback) => {
  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.name || !data.name.length || typeof data.name != 'string')
    return callback('bad_request');

  data.width = (!data.width || typeof data.width != 'number' || data.width <= 0 || data.width > MAX_IMAGE_SIZE) ? null : parseInt(data.width);
  data.height = (!data.height || typeof data.height != 'number' || data.height <= 0 || data.height > MAX_IMAGE_SIZE) ? null : parseInt(data.height);

  if (!data.width && !data.height)
    return callback('bad_request');

  const imagePath = data.name + '-' + data.width + 'w-' + data.height + 'h';

  return callback(null, imagePath);
};