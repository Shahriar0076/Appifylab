const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const config = require("./config");
const authRoutes = require("./routes/auth-routes");
const postRoutes = require("./routes/post-routes");
const profileRoutes = require("./routes/profile-routes");
const networkRoutes = require("./routes/network-routes");
const notificationRoutes = require("./routes/notification-routes");
const storyRoutes = require("./routes/story-routes");
const groupRoutes = require("./routes/group-routes");
const eventRoutes = require("./routes/event-routes");
const messageRoutes = require("./routes/message-routes");
const searchRoutes = require("./routes/search-routes");
const insightRoutes = require("./routes/insight-routes");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const origin = req.get("origin");
  if (mutating && origin && origin !== config.clientOrigin) {
    return res.status(403).json({ error: { message: "Request origin is not allowed." } });
  }
  next();
});
app.get("/api/health", (_req, res) => res.json({ data: { status: "ok" } }));
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/insights", insightRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
