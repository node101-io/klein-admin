const MAX_IMAGE_SIZE = 1e4;

/**
 * @param {{
 *   name: string,
 *   width?: number,
 *   height?: number
 * }} data
 * @returns {string}
 */
module.exports = data => {
  if (!data || typeof data != 'object') return;
  if (!data.name || !data.name.length || typeof data.name != 'string') return;

  data.width = (!data.width || typeof data.width != 'number' || data.width <= 0 || data.width > MAX_IMAGE_SIZE) ? null : parseInt(data.width);
  data.height = (!data.height || typeof data.height != 'number' || data.height <= 0 || data.height > MAX_IMAGE_SIZE) ? null : parseInt(data.height);

  return data.name + '-' + data.width + 'w-' + data.height + 'h';
};