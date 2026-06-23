# Product Browser

A full-stack product browsing app with a Vite + React frontend and an Express + Prisma backend. It supports product listing, keyset pagination, category filters, and min/max price filters.

## Features

- Product catalog with load-more pagination
- Category filtering
- Min and max price filtering
- Responsive card-based UI
- REST API with Express
- Prisma-backed MongoDB data layer

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express
- Database: MongoDB
- ORM: Prisma

## Project Structure

- `frontend/` - React app
- `product-api/` - Express API server
- `product-api/prisma/` - Prisma schema and seed script

## API

Base URL:

- Local: `http://localhost:3000`
- Production: `https://product-api-exo1.onrender.com`

### Endpoint

- `GET /products`

Query params:

- `limit`
- `cursor`
- `category`
- `minPrice`
- `maxPrice`

Example:

```bash
GET /products?limit=12&category=Books&minPrice=100
```

Example response:

```json
{
  "hasMore": true,
  "nextCursor": "base64-cursor",
  "items": []
}
```

## Setup

### Backend

```bash
cd product-api
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend `.env`

```env
DATABASE_URL="your-mongodb-connection-string"
FRONTEND_ORIGIN="https://your-frontend-domain"
```

### Frontend `.env`

```env
VITE_API_BASE_URL="https://your-api-domain"
```

## Seed Data

To load sample products:

```bash
cd product-api
npm run seed
```

## Build

### Backend checks

```bash
cd product-api
npm run check
```

### Frontend build

```bash
cd frontend
npm run build
```

## Deployment

- Frontend: Vercel
- Backend: Render

## License

This project is for learning and demo purposes.
