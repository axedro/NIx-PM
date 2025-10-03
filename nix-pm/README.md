# NIx PM - Business Intelligence Platform

A modern, whitelabeled React application for embedding and managing Superset dashboards and charts.

## Features

- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Responsive Layout**: Collapsible sidebar with professional design
- **Whitelabeled**: All Superset branding replaced with NIx PM
- **Embedded Analytics**: Seamlessly embedded Superset dashboards and charts
- **Secure Authentication**: Integration with Superset API

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Superset instance running on `http://localhost:8088`
- Superset credentials (default: admin/admin)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Usage

1. Start your Superset instance on `http://localhost:8088`
2. Run the development server with `npm run dev`
3. Navigate to `http://localhost:5173`
4. Login with your Superset credentials (default: admin/admin)
5. View and interact with your dashboards and charts

## Configuration

### Superset URL

To change the Superset instance URL, update the `SUPERSET_URL` constant in `src/services/superset.ts`:

```typescript
const SUPERSET_URL = 'http://localhost:8088';
```

### Logo

The logo is located at `/public/logo.png`. Replace this file with your own logo to customize the branding.

## Project Structure

```
nix-pm/
├── public/          # Static assets
├── src/
│   ├── components/  # React components
│   │   └── Layout.tsx
│   ├── pages/       # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboards.tsx
│   │   └── Charts.tsx
│   ├── services/    # API services
│   │   └── superset.ts
│   ├── App.tsx      # Main app component
│   └── main.tsx     # Entry point
└── package.json
```

## Technologies

- **React** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **Superset Embedded SDK** - Dashboard embedding
- **Lucide React** - Icons

## License

MIT
