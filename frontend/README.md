# Email Orchestrator Frontend

Next.js 13+ React dashboard for email campaign management and monitoring.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

3. Run development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Vercel

1. Connect your GitHub repository to Vercel
2. Vercel will auto-detect this as a Next.js project in the `frontend/` directory
3. Set `NEXT_PUBLIC_API_URL` environment variable to your backend URL
4. Deploy!

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Run production server
- `pnpm lint` - Run ESLint

## Project Structure

- `app/` - Next.js 13+ app router pages and layouts
- `components/` - Reusable React components
  - `ui/` - Shadcn/ui component library
  - `campaign/` - Campaign-specific components
  - `execution/` - Execution monitoring components
  - `layout/` - Layout components
- `hooks/` - Custom React hooks
- `lib/` - Utility functions and contexts
- `public/` - Static assets
- `styles/` - Global CSS styles

## Features

- Campaign builder with multi-step wizard
- Real-time execution monitoring
- Email template editor
- Settings management
- Admin panel
- Responsive design with Tailwind CSS
