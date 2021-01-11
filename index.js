require('dotenv').config();

const aws = require('aws-sdk');
const Imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

const s3 = new aws.S3({ params: { Bucket: process.env.S3_BUCKET }});

const processFile = async ({ Key }) => {
  try {
    const data = await s3.headObject({ Key }).promise();
    const skip = await checkFile(data);
    if (skip) return;

    const file = await downloadAndMinify(Key);
    await uploadFile(Key, file, data);
  }
  catch (err) {
    console.error(err);
  }
}

const checkFile = async (data) => {
  const type = data.ContentType;
  if (type !== 'image/png' && type !== 'image/jpeg') {
    console.log('File is not an image type. Skipping.');
    return true;
  }

  if (data.Metadata && data.Metadata.optimized) {
    console.log('Image is already optimized. Skipping.');
    return true;
  }

  if (!data.ContentLength) {
    console.log('Image is empty. Skipping.');
    return true;
  }

  return false;
};

const downloadAndMinify = async (key) => {
  const { Body } = await s3.getObject({ Key: key }).promise();

  const buffer = await Imagemin.buffer(Body, {
    plugins: [
      imageminMozjpeg(),
      imageminPngquant({quality: [0.65, 0.8]})
    ]
  });

  const percent = (1 - buffer.length / Body.length) * 100;
  console.log(`Optimized! ${key} reduced from ${formatSize(Body.length)} to ${formatSize(buffer.length)}. (-${parseFloat(percent).toFixed(0)}%)`);

  return buffer;
};

const uploadFile = async (key, buffer, data) => {
  const metadata = { ...data.Metadata, optimized: 'y' };
  const params = {
    Key: key,
    Body: buffer,
    ContentType: data.ContentType,
    Metadata: metadata
  }

  await s3.upload(params).promise();
}

const formatSize = (bytes) => {
  if (bytes < 2**10) return `${bytes} bytes`;
  else if (bytes < 2**20) return `${parseFloat(bytes / 2**10).toFixed(0)} KB`;
  else if (bytes < 2**30) return `${parseFloat(bytes / 2**20).toFixed(1)} MB`;
  else return `${parseFloat(bytes / 2**30).toFixed(2)} GB`;
}

const start = async (token) => {
  const params = { MaxKeys: 100 };
  if (token) params.ContinuationToken = token;
  const resp = await s3.listObjectsV2(params).promise();
  if (!resp || !resp.Contents || !resp.Contents.length) return;
  
  const promises = resp.Contents.map(processFile);
  await Promise.all(promises);

  if (resp.IsTruncated) await start(resp.NextContinuationToken);
}

start();
