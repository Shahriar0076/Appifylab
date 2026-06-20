# Appify Feed Frontend

Next.js frontend for the Appify social app.

The app includes feed, stories, profiles, friends, messages, groups, events, saved posts, search, notifications, settings, and insights pages. The main list experiences load 3 items at a time and automatically fetch the next 3 when the user scrolls near the bottom.

## Local Setup

Start the backend first, then:

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

`.env.local` should include:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

For Google authentication, use the same OAuth web client ID as the backend.

## Demo Data

Run the backend seed before testing the full UI:

```powershell
cd ../backend
npm.cmd run seed
```

All seeded users use password `AppifyDemo123!`. Example login:

```text
john@appify.local
```

The seeded dataset includes Cloudinary-backed profile images, cover photos, stories, image posts, group covers, event images, friends, follows, saved posts, comments, replies, reactions, and messages.

## Infinite Scroll

These pages request 3 items at a time and append more content as the user scrolls:

- Feed posts
- Groups list
- Posts inside a group
- Events list
- Friend requests, friends, and people suggestions

The shared scroll trigger lives in `lib/use-infinite-scroll.ts`.

## Deployment

Deploy this folder to Vercel, Netlify, or another Next.js host.

Set:

```env
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

After the frontend is deployed, update the Render backend `CLIENT_ORIGIN` to the frontend URL so API requests, cookies, CORS, and Socket.IO work correctly.

## Verify

```powershell
npm.cmd run lint
npm.cmd run build
```
