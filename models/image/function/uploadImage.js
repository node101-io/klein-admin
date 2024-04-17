const AWS = require('aws-sdk');
const fs = require('fs');
const sharp = require('sharp');
const async = require('async');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

module.exports = (data, callback) => {
  const file_content = fs.readFileSync('./public/res/uploads/' + data.file_name);

  const resizeParameters = data.resize_parameters.map(param => {
    return {
      fit: param.fit,
      width: param.width,
      height: param.height
    };
  });

  const url_list = [];

  async.timesSeries(resizeParameters.length, (time, next) => {
    sharp(file_content)
      .resize(resizeParameters[time])
      .webp()
      .toBuffer()
      .then(image => {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `${data.original_name}-${resizeParameters[time].width}w-${resizeParameters[time].height}h`,
          Body: image,
          ContentType: 'image/webp',
          ACL: 'public-read'
        };

        s3.upload(params, (err, response) => {
          if (err) return callback(err);

          url_list.push({
            url: response.Location,
            width: resizeParameters[time].width,
            height: resizeParameters[time].height
          });

          if (url_list.length == resizeParameters.length)
            return callback(null, url_list);

          next();
        });
      })
      .catch(err => callback('database_error'));
  });
};
