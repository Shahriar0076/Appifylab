# Appify Backend

Express API and Socket.IO server for Appify. The backend uses MongoDB for data and Cloudinary for uploaded media, so production does not depend on local database or upload folders.

## Local Setup

```powershell
Copy-Item .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
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

## Render Deployment

1. Create a MongoDB Atlas free cluster and copy its connection string into `MONGODB_URI`.
2. Create a free Cloudinary account and copy the cloud name, API key, and API secret.
3. Create a Render Web Service from this repo.
4. Set the root directory to `backend`.
5. Set build command: `npm install && npm run migrate`.
6. Set start command: `npm start`.
7. Add the environment variables above.
8. After the first deploy, optionally run `npm run seed` from a Render shell to create demo data.

## Verify

```powershell
npm run check
npm test
```

`npm test` needs access to the MongoDB URI configured in `.env` or a local MongoDB server.
