# Appify Backend

Express API and Socket.IO server for Appify. The backend uses MongoDB for data and Cloudinary for uploaded media, so production does not depend on local database or upload folders.

The API supports auth, profiles, posts, comments, reactions, saved posts, stories, groups, events, friend/follow networking, notifications, messages, search, and insights. Feed-style list endpoints support cursor pagination for 3-at-a-time infinite scrolling in the frontend.

## Local Setup

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run migrate
npm.cmd run seed
npm.cmd run dev
```

The API and WebSocket server run together on `http://localhost:4000`.

## Environment Variables

```env
PORT=4000
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend-domain.vercel.app
JWT_SECRET=use-a-long-random-secret
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=appify
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=appify
GOOGLE_CLIENT_ID=
```

Do not commit real secrets. Add these values in Render's environment settings.

## Demo Seed

The reusable seed script is `src/db/seed.js`.

Running:

```powershell
npm.cmd run seed
```

will:

- Clear all MongoDB app collections.
- Clear old Appify Cloudinary image, attachment, and demo-seed assets.
- Clear stale local files in `backend/uploads`.
- Upload demo images from `C:\Users\Shahriar\Downloads\images` to Cloudinary.
- Create 10 users, 10 stories, 20 main feed image posts, 40 group posts, comments, replies, reactions, saved posts, follows, accepted friendships, messages, 10 groups, and 10 events.

All seeded users use password `AppifyDemo123!`.

Seeded emails:

```text
john@appify.local
jane@appify.local
bob@appify.local
alice@appify.local
charlie@appify.local
diana@appify.local
edward@appify.local
fiona@appify.local
george@appify.local
helen@appify.local
```

Cloudinary credentials must be configured before running the seed. If the image source folder is different on another machine or server, update `sourceRoot` in `src/db/seed.js`.

## Pagination

The frontend uses these list endpoints with `limit=3` and cursor query parameters:

- `GET /api/posts?limit=3&cursor=<postId>`
- `GET /api/groups?limit=3&cursor=<offset>`
- `GET /api/groups/:id?postsLimit=3&postsCursor=<postId>`
- `GET /api/events?limit=3&cursor=<offset>`
- `GET /api/network/people?limit=3&cursor=<offset>`
- `GET /api/network/friends?limit=3&cursor=<offset>`
- `GET /api/network/requests?limit=3&cursor=<offset>`

Responses keep their existing array keys and include `nextCursor` when another page is available.

## Render Deployment

1. Create a MongoDB Atlas free cluster and copy its connection string into `MONGODB_URI`.
2. Create a free Cloudinary account and copy the cloud name, API key, and API secret.
3. Create a Render Web Service from this repo.
4. Set the root directory to `backend`.
5. Set build command: `npm install && npm run migrate`.
6. Set start command: `npm start`.
7. Add the environment variables above.
8. After the first deploy, optionally run `npm run seed` from a Render shell to create demo data. Make sure the seed image source exists in that environment, or adjust `sourceRoot` first.

## Verify

```powershell
npm.cmd run check
npm.cmd test
```

`npm test` needs access to the MongoDB URI configured in `.env` or a local MongoDB server.
