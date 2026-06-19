# Appify Feed Frontend

Next.js frontend for the Appify social app.

## Local Setup

Start the backend first, then:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

`.env.local` should include:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

For Google authentication, use the same OAuth web client ID as the backend.

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
npm run lint
npm run build
```
