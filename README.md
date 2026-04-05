# Slideshow Generator

A step-by-step slideshow generator with a production-ready backend for:

- PostgreSQL slideshow persistence
- S3-compatible file storage for photos/music/backgrounds
- Coolify deployment via Docker

## Features

- **Step-by-step wizard** for creating slideshows
- **Multiple image groups** with customizable names
- **Transition effects** (fade, slide, zoom, flip, dissolve)
- **Background music** selection
- **Custom background images**
- **Backend persistence** for saving/loading slideshows
- **S3 asset storage** for uploaded media
- **High-quality video export** (1080p)

## Architecture

- `React + Vite` frontend
- `Express` API server (`/api`)
- `Prisma + PostgreSQL` for slideshow/settings metadata
- `S3-compatible bucket` for uploaded files

## Environment Variables

Copy `.env.example` to `.env` and set values for your environment.

Required:
- `DATABASE_URL`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Optional:
- `S3_ENDPOINT` (for MinIO/R2/Spaces/etc.)
- `S3_FORCE_PATH_STYLE=true` for many S3-compatible providers
- `S3_PUBLIC_URL_BASE` for public object URLs instead of signed URLs

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`

3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

4. Run database schema (choose one):
   ```bash
   npm run db:push
   ```
   or for migration-based deploys:
   ```bash
   npm run db:migrate
   ```

5. Start app (frontend + backend):
   ```bash
   npm run dev
   ```

6. Open your browser and start creating slideshows.

## Production / Coolify

This repo includes a `Dockerfile` ready for Coolify:

1. Create a PostgreSQL service in Coolify and set `DATABASE_URL`.
2. Set S3 environment variables in Coolify app settings.
3. Deploy from this repo with Docker build.
4. Container startup runs:
   - `prisma migrate deploy`
   - `node server/index.mjs`

## Technologies Used

- React + TypeScript
- Tailwind CSS
- Express
- Prisma + PostgreSQL
- AWS SDK (S3-compatible storage)
- Canvas API for video generation
- Vite for development and building

## License

MIT License - feel free to use this project for your own slideshows!