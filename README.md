# Sports Jedi

Complete full-stack starter for a sports intelligence application.

## Included
- React + Vite frontend
- Node + Express backend
- Game dashboard
- League filters
- Live/final/upcoming game states
- Matchup detail screen
- AI-style win probability and confidence engine
- Provider adapter so mock data can later be replaced with a real sports API
- Responsive mobile layout

## Run locally
### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173.

## Production layout
- Frontend: Netlify
- Backend: existing Oracle/Linux server behind a subdomain such as `sports-api.example.com`
- Set `VITE_API_BASE_URL` in Netlify to the backend URL.
- Set `FRONTEND_ORIGIN` on the backend to your Netlify/custom domain.

## Real sports data
Replace the mock provider in `backend/src/services/sportsProvider.js` with the API vendor of your choice. Keep the route contract the same and the frontend will continue to work.
