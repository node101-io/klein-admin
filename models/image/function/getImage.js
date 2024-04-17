module.exports = (image, callback) => {
  if (!image || !image._id)
    return callback('document_not_found');

  return callback(null, {
    _id: image._id.toString(),
    url_list: image.url_list
  });
};
