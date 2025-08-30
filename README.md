# Fitness Project Monorepo

This repository contains the Next.js app under `catherine-app` and supporting files.

## Develop
- cd `catherine-app`
- npm install
- npm run dev

## Build
- npm run build (uses standard Next.js compiler)

## Deploy (Vercel)
- Root Directory: `catherine-app`
- Build Command: `next build`
- Output: `.next`
- Add env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Environment
- Do not commit `.env.local`.
- Provide `.env.example` instead with placeholders.