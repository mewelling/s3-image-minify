# S3 Minify

This script connects to an AWS S3 Bucket that contains images. It will iterate through all keys and look for valid `png` or `jpeg` images that it has not yet converted, download and convert them using `imagemin`, and then upload the minified versions to the _same_ S3 bucket.

## Usage
1. Copy `.env-sample` to a new `.env` file and fill in the missing variables
1. Run `npm install`
1. Run `node index.js`

## Example output
```
Optimized! img1.jpeg reduced from 1.5 MB to 360 KB. (-76%)
Optimized! img2.jpeg reduced from 1.3 MB to 285 KB. (-79%)
Image is already optimized. Skipping.
Optimized! img3.jpeg reduced from 1.6 MB to 233 KB. (-85%)
```

## Notes
`S3_BUCKET` is both the source *and* destination bucket. You might want to enable versioning if you are interested in preserving the originals.