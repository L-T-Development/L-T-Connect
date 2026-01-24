# L-T-Connect

<div align="center">
  <img src="public/logo.svg" alt="L-T-Connect Logo" width="120" height="120">
  
  **Enterprise Project Management & Attendance Platform**

  [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![Appwrite](https://img.shields.io/badge/Appwrite-14-F02E65?logo=appwrite)](https://appwrite.io/)
</div>

---

## 📋 Overview

L-T-Connect is a comprehensive enterprise project management and attendance platform built with modern web technologies. It provides teams with powerful tools for project tracking, sprint management, time tracking, leave management, and team collaboration—all in one integrated solution.

## ✨ Features

- **📊 Dashboard & Analytics** - Real-time insights and project metrics
- **📁 Project Management** - Create and manage projects with epics, sprints, and tasks
- **🎯 Sprint Planning** - Agile sprint management with Kanban boards
- **✅ Task Management** - Comprehensive task tracking with drag-and-drop support
- **📝 Requirements Tracking** - Functional requirements management
- **⏱️ Time Tracking** - Log and monitor time spent on tasks
- **📅 Attendance Management** - Employee attendance tracking and reporting
- **🏖️ Leave Management** - Request and approve leave applications
- **👥 Team Management** - Workspace-based team collaboration
- **🔔 Notifications** - Stay updated with real-time notifications
- **🌙 Dark Mode** - Full dark/light theme support
- **📱 Responsive Design** - Works seamlessly across devices

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **State Management:** [TanStack Query](https://tanstack.com/query)
- **Forms:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts:** [Recharts](https://recharts.org/)
- **Drag & Drop:** [@hello-pangea/dnd](https://github.com/hello-pangea/dnd), [@dnd-kit](https://dndkit.com/)

### Backend
- **BaaS:** [Appwrite](https://appwrite.io/)
- **API Framework:** [Hono](https://hono.dev/)
- **Email:** [Resend](https://resend.com/)

### Infrastructure
- **Containerization:** [Docker](https://www.docker.com/)
- **CI/CD:** Jenkins, GitHub Actions

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Appwrite** instance (cloud or self-hosted)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/L-T-Development/L-T-Connect.git
cd L-T-Connect
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env.local` file in the root directory with the following variables:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id

# Additional Appwrite Collections (as needed)
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_SPRINTS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_EPICS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_LEAVE_COLLECTION_ID=

# Server-side Appwrite API Key (keep secret)
APPWRITE_API_KEY=your_api_key
```

### 4. Set Up Database

Run the database setup script to create required collections and attributes:

```bash
npm run db:setup
```

Verify the database schema:

```bash
npm run db:verify
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🐳 Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up -d
```

### Build Image Manually

```bash
docker build -t lt-connect .
docker run -p 3000:3000 --env-file .env.local lt-connect
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |
| `npm run format` | Format code with Prettier |
| `npm run db:setup` | Set up database schema |
| `npm run db:verify` | Verify database schema |
| `npm run create:admin` | Create admin user |
| `npm run sync:users` | Sync users collection |

## 📂 Project Structure

```
lt-connect/
├── public/              # Static assets
├── scripts/             # Database and utility scripts
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── (auth)/      # Authentication routes
│   │   ├── (dashboard)/ # Dashboard routes
│   │   └── api/         # API routes
│   ├── components/      # React components
│   │   ├── ui/          # Base UI components
│   │   ├── project/     # Project-related components
│   │   ├── task/        # Task-related components
│   │   ├── sprint/      # Sprint-related components
│   │   └── ...          # Feature-specific components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries
│   ├── services/        # API and service layer
│   ├── styles/          # Global styles
│   └── types/           # TypeScript type definitions
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker build configuration
└── package.json         # Project dependencies
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code:
- Passes linting (`npm run lint`)
- Passes type checking (`npm run type-check`)
- Is properly formatted (`npm run format`)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ by L-T Development</p>
</div>
