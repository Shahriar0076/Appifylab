const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v2: cloudinary } = require("cloudinary");
const config = require("../config");
const HttpError = require("../utils/http-error");

const hasCloudinary = config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret;

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

const storage = hasCloudinary
  ? new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `${config.cloudinary.folder}/images`,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      resource_type: "image",
    },
  })
  : multer.memoryStorage();

function normalizeCloudinaryFile(req, _res, next) {
  const files = [
    ...(req.file ? [req.file] : []),
    ...Object.values(req.files || {}).flat(),
  ];
  files.forEach((file) => {
    if (!file.path && file.buffer) {
      file.path = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    }
    file.filename = file.filename || file.public_id || file.originalname;
  });
  next();
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      return callback(new HttpError(400, "Only JPEG, PNG, WebP, and GIF images are allowed."));
    }
    callback(null, true);
  },
});

upload.normalize = normalizeCloudinaryFile;

module.exports = upload;
