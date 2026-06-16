# Appify — Social Media Demo App

A full-stack social media application with real-time features built with **Next.js 16**, **Express 5**, **Socket.IO**, and **SQLite**.

[![Demo Video](https://img.shields.io/badge/Watch-Demo%20Video-red?logo=youtube)](https://youtu.be/HByCLMVrG60)

## Prerequisites

- Node.js 18+ (developed on v26)
- npm

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install

cd ../appify-feed
npm install

cd ..
```

### 2. Environment Variables (optional)

The backend includes a `.env` file with sensible defaults. Review and adjust if needed:

```env
PORT=4000                          # API server port
CLIENT_ORIGIN=http://localhost:3000 # Frontend URL (for CORS)
JWT_SECRET=your-secret-key         # Change in production
NODE_ENV=development               # Set to "production" for deployment
GOOGLE_CLIENT_ID=                  # Optional: for Google OAuth login
```

**Google Login** — To enable "Sign in with Google", set `GOOGLE_CLIENT_ID` to your OAuth 2.0 client ID from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). The app will still work with email/password login without it.

### 3. Seed the database

```bash
cd backend
npm run seed
```

This creates a SQLite database with 10 users, posts, groups, events, conversations, reactions, comments, stories, and follows — all with images and realistic data.

### 3. Start the backend (API + WebSocket)

```bash
cd backend
npm run dev
```

The API server runs at **http://localhost:4000**.

### 4. Start the frontend

Open a **new terminal** and run:

```bash
cd appify-feed
npm run dev
```

The app runs at **http://localhost:3000**.

---

## Demo Accounts

All accounts use the same password: **`AppifyDemo123!`**

| Email | Name | Role |
|---|---|---|
| demo@appify.local | Demo User | Software Developer |
| ryan@appify.local | Ryan Roslansky | Product Designer |
| evan@appify.local | Evan You | Frontend Engineer |
| sarah@appify.local | Sarah Chen | UX Researcher |
| marcus@appify.local | Marcus Johnson | Data Scientist |
| priya@appify.local | Priya Patel | Marketing Lead |
| james@appify.local | James Wilson | DevOps Engineer |
| emily@appify.local | Emily Rodriguez | Content Creator |
| alex@appify.local | Alex Kim | AI Researcher |
| olivia@appify.local | Olivia Thompson | Startup Founder |

---

## Project Structure

```
Appifylab2/
├── backend/                  # Express API + Socket.IO server
│   ├── src/
│   │   ├── server.js         # Entry point (HTTP + WebSocket)
│   │   ├── app.js            # Express app & route mounting
│   │   ├── config.js         # Environment config
│   │   ├── controllers/      # Route handlers
│   │   ├── services/         # Business logic & DB queries
│   │   ├── routes/           # Express route definitions
│   │   ├── middleware/       # Auth, upload, error handling
│   │   ├── realtime/         # Socket.IO broadcast helpers
│   │   ├── db/               # Schema, migrations, seed
│   │   └── utils/            # Slug generation, presenters
│   ├── uploads/              # User-uploaded images
│   └── data/                 # SQLite database file
├── appify-feed/              # Next.js frontend
│   ├── app/                  # Next.js App Router pages
│   │   ├── feed/             # Main newsfeed
│   │   ├── groups/           # Group listing & detail
│   │   ├── events/           # Event listing & detail
│   │   ├── messages/         # Direct messages
│   │   ├── profile/          # User profiles
│   │   ├── friends/          # Friends & suggestions
│   │   ├── notifications/    # Notifications
│   │   ├── saved/            # Saved posts
│   │   ├── search/           # Search results
│   │   ├── insights/         # Analytics dashboard
│   │   └── settings/         # Privacy & notification prefs
│   ├── components/           # Shared React components
│   └── lib/                  # API client, types, routes
└── ui/                       # UI design assets
```

## Features

- **News Feed** — Scrollable feed with posts, reactions (like/love/haha), comments, and sharing
- **Real-time Updates** — New posts, reactions, comments appear instantly via Socket.IO
- **Groups** — Create/join groups, group posts, member roles (admin/moderator/member)
- **Events** — Create events, RSVP, invite friends
- **Direct Messages** — Real-time chat with typing indicators and online presence
- **User Profiles** — Customizable profiles with cover photos, bio, workplace, location
- **Friend System** — Send/accept/reject friend requests, follow/unfollow
- **Notifications** — Real-time notifications for interactions
- **Stories** — 24-hour ephemeral stories with views
- **Insights** — Analytics dashboard with activity charts, follower growth, engagement rate, top posts
- **Search** — Unified search across users, posts, groups, events
- **Dark Mode** — Toggle between light and dark themes
