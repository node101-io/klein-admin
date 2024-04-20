const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

module.exports = (data, callback) => {
  const url_list = [];

  async.timesSeries(data.url_list.length, (time, next) => {
    s3.copyObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      CopySource: process.env.AWS_BUCKET_NAME + '/' + data.url_list[time].url.split('/')[data.url_list[time].url.split('/').length - 1],
      Key: data.original_name + '-' + data.url_list[time].width + 'w-' + data.url_list[time].height + 'h'
    }, (err, image) => {
      if (err) return callback(err);

      url_list.push({
        url: image.Location,
        width: data.url_list[time].width,
        height: data.url_list[time].height
      });

      s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: data.url_list[time].url.split('/')[data.url_list[time].url.split('/').length - 1]
      }, err => {
        if (err) return callback(err);

        next();
      });
    });
  }, err => {
    if (err) return callback(err);

    return callback(null, url_list);
  });
};