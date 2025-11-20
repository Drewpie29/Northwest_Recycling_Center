# Northwest Missouri State Recycling Center

## Overview

This is a web-based recycling center management system for Northwest Missouri State University. The application enables users to track and manage campus recycling activities by logging recycling entries (material type, weight, location), viewing personal statistics, and generating reports. The system uses Replit Auth for authentication, providing a seamless login experience for university users.

The application follows a modern full-stack architecture with React on the frontend, Express on the backend, and PostgreSQL for data persistence. It emphasizes data clarity, ease of use, and efficient tracking of recycling metrics across campus locations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React with TypeScript for type safety and component-based development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing (instead of React Router)
- TanStack Query (React Query) for server state management and data fetching

**UI Component System:**
- shadcn/ui component library (Radix UI primitives) for accessible, customizable components
- Tailwind CSS for utility-first styling with custom design tokens
- Material Design principles adapted for institutional applications
- Inter font family for clean, highly legible typography
- Responsive layout with sidebar navigation pattern for authenticated users

**Design Philosophy:**
The design follows a system-based approach prioritizing efficiency and data clarity. The application uses a neutral color scheme with consistent spacing (4, 6, 8, 12, 16, 20 units), rounded corners, and subtle elevation through shadows. Forms are constrained to optimal widths (max-w-2xl) for better completion rates, while data tables expand to larger containers (max-w-6xl).

**State Management:**
- TanStack Query handles all server state (user data, recycling entries, statistics)
- React hooks manage local UI state
- Custom hooks (`useAuth`, `useToast`, `useIsMobile`) encapsulate reusable logic

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and API routing
- Session-based authentication using Replit's OpenID Connect (OIDC) provider
- PostgreSQL session store for persistent login sessions

**Authentication Flow:**
The application uses username/password authentication with Passport.js local strategy. User passwords are securely hashed using Node.js crypto.scrypt with random salts. Sessions are stored in PostgreSQL with a 7-day TTL. 

**Role-Based Access Control:**
The system implements two user roles:
- **Administrator**: Full system access including user management, material category management, sales tracking, and all bale operations
- **Technician**: Limited access to create and edit their own bale entries only

Middleware functions protect routes:
- `isAuthenticated` - Requires any logged-in user
- `isAdmin` - Requires administrator role (403 if not admin)

User accounts can be deactivated by admins, preventing login while preserving historical data.

**API Structure:**
RESTful endpoints organized by domain:
- `/api/auth/*` - Authentication endpoints (user profile, login/logout)
- `/api/stats` - Dashboard statistics aggregation
- `/api/reports` - Reporting data with material and location summaries
- `/api/entries` - CRUD operations for recycling entries
- `/api/material-categories` - Get active material categories (authenticated)
- `/api/admin/material-categories` - Full CRUD for material categories (admin only)

**Data Access Layer:**
The `storage.ts` module implements a repository pattern (`IStorage` interface) with `DatabaseStorage` as the concrete implementation. This abstraction separates business logic from database operations and enables easier testing or database swapping.

### Data Storage

**Database:**
- PostgreSQL via Neon serverless driver
- Drizzle ORM for type-safe database queries and schema management
- WebSocket-based connection pooling for serverless environments

**Schema Design:**
Core tables:
1. `sessions` - Stores Express session data (required for username/password authentication)
2. `users` - User profiles with username/password credentials, role (admin/technician), and isActive status
3. `material_categories` - Dynamic material categories with soft-delete (isActive flag)
4. `recycling_entries` - Core domain data tracking individual recycling activities (conceptually "bales") with foreign key to material_categories
5. `compost_entries` - Monthly compost tracking with unique user+month constraint

**Material Categories:**
The system uses database-managed material categories instead of hardcoded enums. Administrators can add new categories and deactivate existing ones through the admin interface at `/categories`. The system starts with 12 pre-populated categories:
- Aluminum
- Cardboard
- Glass
- Paper - Mixed
- Paper - Books
- Paper - Newspaper
- Paper-White
- Plastic - #1 PET
- Plastic - #2 Colored
- Plastic - #2 Natural
- Scrap Metal
- Other - Recycled

Categories use a soft-delete pattern with the `isActive` integer field (1=active, 0=inactive). Inactive categories are hidden from entry forms but preserved for historical data integrity.

**Key Design Decisions:**
- UUID primary keys for all tables using PostgreSQL's `gen_random_uuid()`
- `decimal(10, 2)` for weight measurements to ensure precision
- Timestamps for audit trails (`createdAt`, `collectedAt`)
- Foreign key relationships enforce referential integrity (entries → users, entries → material_categories)
- Material categories stored in database table with soft-delete pattern for flexibility and historical preservation
- Category names enforced as unique at database level to prevent duplicates

**Schema Validation:**
Drizzle-Zod integration generates Zod schemas from database schema, ensuring consistent validation between database constraints and API input validation.

### External Dependencies

**Authentication:**
- Username/password authentication with Passport.js local strategy
- Password hashing using Node.js crypto.scrypt with random salts
- Session management with PostgreSQL-backed session store
- Required environment variables: `SESSION_SECRET`

**Database:**
- Neon PostgreSQL serverless database
- Connection via `DATABASE_URL` environment variable
- WebSocket protocol for connection pooling (`@neondatabase/serverless` with `ws` package)

**Session Storage:**
- `connect-pg-simple` - PostgreSQL-backed session store for Express
- Sessions stored in `sessions` table with automatic expiration

**UI Components:**
- Radix UI - Unstyled, accessible component primitives (@radix-ui/react-*)
- Lucide React - Icon library for consistent iconography
- date-fns - Date formatting and manipulation
- react-hook-form + Zod - Form validation and management

**Development Tools:**
- Replit-specific Vite plugins for enhanced development experience (cartographer, dev banner, runtime error overlay)
- TypeScript for static type checking
- ESBuild for production server bundling

**Build & Deployment:**
- Production build bundles client assets to `dist/public` and server code to `dist/index.js`
- Server runs as ES modules (`"type": "module"` in package.json)
- Vite middleware mode for development with HMR