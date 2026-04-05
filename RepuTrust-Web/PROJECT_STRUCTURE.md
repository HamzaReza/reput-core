# RepuTrust Project Structure

## Overview

RepuTrust is a Next.js-based reputation management platform built with TypeScript, React 19, and Tailwind CSS 4.

## Directory Structure

```
RepuTrust/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── auth/              # Authentication pages
│   │   │   └── page.tsx       # Sign-in/registration
│   │   ├── dashboard/         # User dashboard
│   │   │   └── page.tsx       # Main dashboard view
│   │   ├── quote/             # Quote request
│   │   │   └── page.tsx       # Quote form
│   │   ├── settings/          # User settings
│   │   │   └── page.tsx       # Settings management
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles with theme
│   │
│   ├── components/            # Reusable React components
│   │   ├── common/            # Common components used across app
│   │   │   ├── Header.tsx     # Navigation header with logo
│   │   │   ├── Hero.tsx       # Hero section for landing page
│   │   │   └── Features.tsx   # Features showcase
│   │   ├── auth/              # Authentication components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── quote/             # Quote/offer components
│   │   ├── notifications/     # Notification components
│   │   ├── settings/          # Settings components
│   │   └── shared/            # Shared utility components
│   │
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions and helpers
│   ├── types/                 # TypeScript type definitions
│   └── styles/                # Style modules (if needed)
│
├── public/                    # Static assets
│   ├── logo.svg              # RepuTrust logo (SVG)
│   └── images/               # Additional images
│
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── next.config.ts           # Next.js configuration
├── postcss.config.mjs       # PostCSS configuration
├── .env.example             # Environment variables template
├── PROJECT_STRUCTURE.md     # This file
└── README.md               # Project documentation
```

## Theme Colors

RepuTrust uses a professional color scheme inspired by the brand:

- **Primary (Teal)**: `#4ECDC4` - Main brand color for CTAs and highlights
- **Primary Dark**: `#2BABA0` - Darker shade for hover states
- **Primary Light**: `#7FE8E0` - Lighter shade for backgrounds
- **Secondary (Dark Blue)**: `#2D3E50` - Text and secondary elements
- **Success**: `#27AE60` - Positive actions/states
- **Warning**: `#F39C12` - Warning messages
- **Error**: `#E74C3C` - Error states
- **Info**: `#3498DB` - Information messages
- **Background**: `#FFFFFF` / `#1A1F2E` (dark mode)
- **Surface**: `#F8F9FA` / `#242D3D` (dark mode)
- **Border**: `#DDE1E6` / `#3D4A5C` (dark mode)

## Technology Stack

- **Framework**: Next.js 16.2.2
- **Language**: TypeScript 6.0.2
- **UI Library**: React 19.2.4
- **Styling**: Tailwind CSS 4 with PostCSS
- **Linting**: ESLint 10.2.0
- **Node Types**: @types/node 25.5.2

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Navigate to the project directory:

```bash
cd RepuTrust
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Key Pages

- **Home** (`/`) - Landing page with hero and features
- **Sign In** (`/auth`) - User authentication
- **Dashboard** (`/dashboard`) - User reputation dashboard
- **Get Quote** (`/quote`) - Service quote request form
- **Settings** (`/settings`) - User preferences and privacy settings

## Component Hierarchy

```
App
├── Header (Navigation + Logo)
├── Main Content
│   ├── Hero Section
│   ├── Features Section
│   └── Route-specific Content
└── Footer
```

## Future Development Areas

- [ ] Authentication system (JWT)
- [ ] User profile management
- [ ] Identity verification flow
- [ ] Reputation scoring algorithm
- [ ] Payment integration (Stripe)
- [ ] Email notifications
- [ ] LinkedIn OAuth integration
- [ ] Meeting scheduling system
- [ ] Admin dashboard
- [ ] API routes

## Styling Guidelines

All components use Tailwind CSS classes with custom CSS variables for theming:

```tsx
// Primary button
<button className="bg-color-primary text-white hover:bg-color-primary-dark">
  Action
</button>

// Text
<p className="text-color-foreground">Normal text</p>
<p className="text-color-muted">Muted text</p>
```

## Contributing

When adding new features:

1. Create components in appropriate subdirectory under `src/components/`
2. Add TypeScript types in `src/types/`
3. Use custom hooks for shared logic in `src/hooks/`
4. Follow the established color theme and spacing conventions
5. Ensure responsive design with Tailwind's responsive classes

## License

All rights reserved © 2026 Ealixir
