/**
 * @callback formatImageCallback
 * @param {string} err
 * @param {{
 *  _id: string,
 *  url_list: Array.<{
 *    url: string,
 *    width: number,
 *    height: number
 *  }>
 * }} image
 */

/**
 * @param {{
 *  _id: string,
 *  name?: string,
 *  expiration_date?: number,
 *  url_list: Array.<{
 *    url: string,
 *    width: number,
 *    height: number
 *  }>
 * }} image
 * @param {formatImageCallback} callback
 */

module.exports = (image, callback) => {
  if (!image || !image._id)
    return callback('document_not_found');

  return callback(null, {
    _id: image._id.toString(),
    url_list: image.url_list
  });
};
