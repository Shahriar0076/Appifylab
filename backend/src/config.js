require("dotenv").config();

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production.");
}
if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI must be configured in production.");
}
if (process.env.NODE_ENV === "production" && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
  throw new Error("Cloudinary credentials must be configured in production.");
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "development-only-change-me",
  isProduction: process.env.NODE_ENV === "production",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/appify",
  mongoDbName: process.env.MONGODB_DB_NAME || "appify",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "appify",
  },
};
