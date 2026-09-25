# Notes App Frontend

Modern React TypeScript frontend for the Notes management application.

## Features

- **Modern Stack**: React 18 + TypeScript + Vite
- **Rich Text Editing**: Tiptap editor with full formatting support
- **Data Management**: React Query for efficient data fetching and caching
- **Responsive Tables**: TanStack Table with sorting, filtering, and pagination
- **Drag & Drop**: Beautiful Kanban board with drag-and-drop support
- **Charts & Analytics**: Recharts for data visualization
- **Dark Mode**: Full dark mode support with theme toggle
- **Notifications**: Toast notifications for user feedback
- **File Uploads**: Drag-and-drop file upload support
- **Multi-select**: Custom multi-select components for tags and team members

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── api/              # API client functions
├── components/       # React components
│   ├── layout/      # Layout components (Sidebar, Header)
│   ├── notes/       # Note-specific components
│   └── shared/      # Reusable components
├── contexts/        # React contexts (Theme)
├── hooks/           # Custom hooks
├── pages/           # Page components
├── types/           # TypeScript type definitions
├── App.tsx          # Main app component with routing
└── main.tsx         # Entry point

## Key Technologies

- **React 18**: Latest React with concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Router v6**: Client-side routing
- **React Query**: Server state management
- **TanStack Table**: Powerful table functionality
- **Tiptap**: Rich text editor
- **Recharts**: Data visualization
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Beautiful icon set
- **React Hot Toast**: Toast notifications
- **React Beautiful DnD**: Drag and drop

## Features Overview

### Notes Management
- Create, edit, delete notes
- Rich text content with HTML formatting
- Tags and buckets for organization
- Team member assignments
- Favorite and hot topic marking
- Track status (NOT_STARTED, IN_PROGRESS, etc.)

### Views
- **Dashboard**: Overview with stats and charts
- **Notes List**: Grid or table view with filters
- **Bucket View**: Kanban board organized by buckets
- **Priority View**: Notes sorted by bucket priority
- **Hot Topics**: Quick access to important items

### Management
- **Tags**: Create and manage tags with colors
- **Buckets**: Organize notes into buckets with priorities
- **Team Members**: Manage team member profiles
- **Deleted Notes**: Restore or permanently delete

## API Integration

The frontend connects to the backend at `http://localhost:8080/api`. All API calls are defined in the `src/api/` directory.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- ESLint configured for React and TypeScript
- Tailwind CSS for styling
- Component-based architecture

## License

MIT
