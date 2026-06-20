# Appify Social Media Demo App

A full-stack social media app with **Next.js**, **Express**, **Socket.IO**, **MongoDB Atlas**, and **Cloudinary**.

The current demo includes a seeded social graph with users, Cloudinary-backed media, stories, posts, comments, replies, likes, saved posts, groups, events, follows, friendships, and conversations. Feed-style pages load content in small batches while scrolling, similar to Facebook.

Live frontend: [https://appify-feed.vercel.app/](https://appify-feed.vercel.app/)

## Project Structure

```text
Appifylab2/
|-- backend/      # Express API + Socket.IO server for Render
|-- appify-feed/  # Next.js frontend
`-- ui/           # Original static UI assets
```

## Local Setup

Install dependencies:

```powershell
cd backend
npm.cmd install

cd ../appify-feed
npm.cmd install
```

Configure backend:

```powershell
cd backend
Copy-Item .env.example .env
```

Set at least:

```env
CLIENT_ORIGIN=http://localhost:3000
JWT_SECRET=replace-with-a-long-random-secret
MONGODB_URI=mongodb+srv://... # or mongodb://127.0.0.1:27017/appify
MONGODB_DB_NAME=appify
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=appify
```

Cloudinary is required for the rich demo seed because seed images are uploaded and stored as Cloudinary URLs. Do not commit real secrets.

Seed demo data:

```powershell
cd backend
npm.cmd run migrate
npm.cmd run seed
```

The seed clears existing MongoDB demo data, clears old Appify Cloudinary demo/upload images, clears stale local `backend/uploads` files, uploads images from `C:\Users\Shahriar\Downloads\images`, and rebuilds the demo dataset.

Start backend:

```powershell
cd backend
npm.cmd run dev
```

Start frontend in another terminal:

```powershell
cd appify-feed
npm.cmd run dev
```

Backend runs at `http://localhost:4000`; frontend runs at `http://localhost:3000`.

## Demo Accounts

All seeded accounts use password `AppifyDemo123!`.

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

Seeded data currently includes 10 users, 10 active stories, 20 main feed image posts, 40 group posts, 60 comments, 140 reactions, 40 saved posts, 10 groups, 10 events, event invitations/attendance, follows, friendships, and demo messages.

The feed, groups, group detail posts, events, and friends pages load 3 items at a time and automatically fetch the next 3 as the user scrolls.

## Deploy Backend To Render

1. Create a free MongoDB Atlas cluster.
2. Add your Render backend host to Atlas network access, or allow `0.0.0.0/0` for a simple free-tier setup.
3. Create a free Cloudinary account.
4. Create a Render Web Service from this repository.
5. Set Render root directory to `backend`.
6. Set build command to `npm install && npm run migrate`.
7. Set start command to `npm start`.
8. Add backend environment variables:

```env
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend-domain
JWT_SECRET=replace-with-a-long-random-secret
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=appify
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=appify
GOOGLE_CLIENT_ID=
```

9. Optional: run `npm run seed` in a Render shell after deploy. Make sure the seed image source exists in that environment, or adjust `sourceRoot` in `backend/src/db/seed.js` before running it there.

## Deploy Frontend

Deploy `appify-feed` to Vercel, Netlify, or another Next.js host.

Current deployment: [https://appify-feed.vercel.app/](https://appify-feed.vercel.app/)

Set:

```env
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Then update the Render backend `CLIENT_ORIGIN` to the deployed frontend URL.

## Verify

```powershell
cd backend
npm.cmd test

cd ../appify-feed
npm.cmd run lint
npm.cmd run build
```

## Notes

- Uploaded images and attachments are stored in Cloudinary.
- App data is stored in MongoDB, not local database files.
- Socket.IO remains on the Express backend and uses the same Render URL as the API.
- Existing local `backend/data` is an old development artifact. `backend/uploads` is cleared by the seed and is not used by the Cloudinary-backed production flow.
