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

const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain", "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: hasCloudinary
    ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: `${config.cloudinary.folder}/attachments`,
        resource_type: "auto",
      },
    })
    : multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new HttpError(400, "This attachment type is not supported."));
    }
    callback(null, true);
  },
});

upload.normalize = (req, _res, next) => {
  if (req.file) {
    if (!req.file.path && req.file.buffer) {
      req.file.path = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    req.file.filename = req.file.filename || req.file.public_id || req.file.originalname;
  }
  next();
};

module.exports = upload;
