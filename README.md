# Appify Social Media Demo App

A full-stack social media app with **Next.js**, **Express**, **Socket.IO**, **MongoDB Atlas**, and **Cloudinary**.

## Project Structure

```text
Appifylab2/
├── backend/      # Express API + Socket.IO server for Render
├── appify-feed/  # Next.js frontend
└── ui/           # Original static UI assets
```

## Local Setup

Install dependencies:

```powershell
cd backend
npm install

cd ../appify-feed
npm install
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
MONGODB_URI=mongodb://127.0.0.1:27017/appify
MONGODB_DB_NAME=appify
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

For production, use MongoDB Atlas and Cloudinary values. Do not commit real secrets.

Seed demo data:

```powershell
cd backend
npm run migrate
npm run seed
```

Start backend:

```powershell
cd backend
npm run dev
```

Start frontend in another terminal:

```powershell
cd appify-feed
npm run dev
```

Backend runs at `http://localhost:4000`; frontend runs at `http://localhost:3000`.

## Demo Accounts

All seeded accounts use password `AppifyDemo123!`.

```text
demo@appify.local
ryan@appify.local
evan@appify.local
sarah@appify.local
marcus@appify.local
priya@appify.local
james@appify.local
emily@appify.local
alex@appify.local
olivia@appify.local
```

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

9. Optional: run `npm run seed` in a Render shell after deploy.

## Deploy Frontend

Deploy `appify-feed` to Vercel, Netlify, or another Next.js host.

Set:

```env
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Then update the Render backend `CLIENT_ORIGIN` to the deployed frontend URL.

## Notes

- Uploaded images and attachments are stored in Cloudinary.
- App data is stored in MongoDB, not local database files.
- Socket.IO remains on the Express backend and uses the same Render URL as the API.
- Existing local `backend/data` or `backend/uploads` folders are old development artifacts and are not used by production code.
