const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const db = require("../db");
const config = require("../config");
const HttpError = require("../utils/http-error");
const { publicUser } = require("../utils/presenters");
const { createUsername } = require("../utils/slugs");

const registrationSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
  acceptedTerms: z.literal(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false),
});

function createToken(userId, remember) {
  return jwt.sign({}, config.jwtSecret, {
    subject: String(userId),
    expiresIn: remember ? "30d" : "1d",
  });
}

async function createProfile(userId) {
  const profiles = await db.collection("user_profiles");
  await profiles.updateOne(
    { user_id: userId },
    { $setOnInsert: { user_id: userId, privacy: "public", notification_preferences: null, created_at: db.timestamp(), updated_at: db.timestamp() } },
    { upsert: true },
  );
}

async function register(input) {
  const data = registrationSchema.parse(input);
  const users = await db.collection("users");
  const email = data.email.toLowerCase();
  if (await users.findOne({ email })) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  const now = db.timestamp();
  const id = await db.nextId("users");
  const user = {
    id,
    first_name: data.firstName,
    last_name: data.lastName,
    username: await createUsername(db, data.firstName, data.lastName, email),
    email,
    password_hash: bcrypt.hashSync(data.password, 12),
    avatar_url: null,
    auth_provider: "password",
    created_at: now,
    updated_at: now,
  };
  await users.insertOne(user);
  await createProfile(id);
  return { user: publicUser(user), token: createToken(id, true) };
}

async function login(input) {
  const data = loginSchema.parse(input);
  const users = await db.collection("users");
  const user = await users.findOne({ email: data.email.toLowerCase() });
  if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  return { user: publicUser(user), token: createToken(user.id, data.remember) };
}

async function googleLogin(input) {
  const credential = z.string().min(1).parse(input.credential);
  if (!config.googleClientId) {
    throw new HttpError(503, "Google authentication is not configured.");
  }
  const ticket = await new OAuth2Client(config.googleClientId).verifyIdToken({
    idToken: credential,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new HttpError(401, "Google did not provide a verified account.");
  }

  const users = await db.collection("users");
  const email = payload.email.toLowerCase();
  let user = await users.findOne({ $or: [{ google_subject: payload.sub }, { email }] });
  if (user?.google_subject && user.google_subject !== payload.sub) {
    throw new HttpError(409, "This email is already linked to another Google account.");
  }

  if (user) {
    await users.updateOne({ id: user.id }, {
      $set: {
        google_subject: payload.sub,
        auth_provider: user.auth_provider === "password" ? "password,google" : user.auth_provider,
        avatar_url: user.avatar_url || payload.picture || null,
        updated_at: db.timestamp(),
      },
    });
    user = await users.findOne({ id: user.id });
  } else {
    const firstName = (payload.given_name || payload.name || "Google").trim().slice(0, 50);
    const lastName = (payload.family_name || "User").trim().slice(0, 50);
    const now = db.timestamp();
    user = {
      id: await db.nextId("users"),
      first_name: firstName,
      last_name: lastName,
      username: await createUsername(db, firstName, lastName, email),
      email,
      password_hash: `google:${payload.sub}`,
      avatar_url: payload.picture || null,
      auth_provider: "google",
      google_subject: payload.sub,
      created_at: now,
      updated_at: now,
    };
    await users.insertOne(user);
    await createProfile(user.id);
  }

  return { user: publicUser(user), token: createToken(user.id, true) };
}

module.exports = { register, login, googleLogin, createProfile };
