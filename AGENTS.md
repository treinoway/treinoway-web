# Treinoway Web - Agent Guide

## Purpose

Treinoway Web is a React SPA testing tool for the Treinoway backend API. It enables trainers to manage training protocols and templates, and allows students to view their assigned protocols and training schedules.

**This is a development/testing tool only, not a production application.**

---

## Tech Stack

- **React 19.2.0** - UI library
- **Vite 7.3.1** - Build tool and dev server
- **React Router v7.13.0** - Client-side routing
- **Axios 1.13.5** - HTTP client with interceptors
- **Pure CSS** - Styling with Material 3 design tokens (no CSS frameworks)
- **React Context API** - Authentication state management

---

## Project Structure

```
treinoway-web/
├── public/
│   ├── img/                      # Logos and icons
│   │   ├── treino_way_transparente.png
│   │   └── treinoway.ico
│   └── vite.svg
├── src/
│   ├── api/
│   │   └── axios.js              # Axios instance with JWT interceptors
│   ├── contexts/
│   │   └── AuthContext.jsx       # Auth state, login, logout, token refresh
│   ├── components/
│   │   ├── Layout.jsx            # Sidebar + main content wrapper
│   │   └── ProtectedRoute.jsx   # Route protection HOC
│   ├── pages/
│   │   ├── Login.jsx             # Public: Login page
│   │   ├── Signup.jsx            # Public: Signup page
│   │   ├── Dashboard.jsx         # Protected: Main dashboard
│   │   ├── Profile.jsx           # Protected: User profile management
│   │   ├── trainer/              # Trainer-only pages
│   │   │   ├── TrainerProfile.jsx
│   │   │   ├── TrainingTemplates.jsx
│   │   │   ├── TrainingProtocols.jsx  # Protocols + Protocol Templates (tabs)
│   │   │   └── ProtocolDetail.jsx
│   ├── App.jsx                   # Main app component with routing
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles with Material 3 design tokens
├── .env.example                  # Environment variables template
├── package.json
├── vite.config.js
└── README.md
```

---

## Routes

### Public Routes
- `/login` - Email/password login
- `/signup` - User registration

### Protected Routes (require authentication)
- `/` - Dashboard
- `/profile` - User profile management

### Trainer Routes (require TRAINER role)
- `/trainer/training-templates` - Training template CRUD
- `/trainer/protocols` - Training protocols + protocol templates (tabs)
- `/trainer/protocols/:id` - Protocol detail with trainings

All protected routes wrap components with `<ProtectedRoute>` and `<Layout>`.

---

## Architecture

### Authentication
- **JWT-based**: Access token + refresh token stored in `localStorage`
- **Auto-refresh**: Axios response interceptor handles 401 errors, refreshes tokens, and retries requests
- **Context**: `AuthContext` provides user state, login/logout/signup functions, and role checking
- **Protected routes**: `ProtectedRoute` component redirects unauthenticated users to `/login`

### State Management
- **Global auth state**: React Context API via `AuthContext`
- **Local component state**: `useState` for forms, loading states, and messages
- **No external state library**: No Redux, Zustand, or MobX

### API Integration
- **Centralized Axios instance**: `src/api/axios.js` with configured baseURL
- **Request interceptor**: Automatically attaches JWT from localStorage
- **Response interceptor**: Handles 401 errors, refreshes tokens, redirects on auth failure
- **Error handling**: Try/catch in components with user-friendly error messages

### Styling
- **Pure CSS**: No Tailwind, Bootstrap, or CSS-in-JS
- **Material 3 design system**: CSS variables for colors, spacing, typography, and radius
- **Design tokens**: Defined in `src/index.css` (`--color-*`, `--spacing-*`, `--radius-*`, `--font-*`)
- **Utility classes**: `.card`, `.btn-primary`, `.btn-secondary`, `.form-input`, `.alert`, `.badge`
- **Font**: Poppins from Google Fonts
- **Mobile-first**: All UI must be designed mobile-first. Base styles target mobile screens; use `min-width` media queries to scale up to tablet (768px) and desktop (1024px). Never write desktop-first styles. Mobile navigation uses a bottom navigation bar — not a sidebar.

---

## Code Patterns

### Component Structure
```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const ComponentName = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/endpoint');
      setData(response.data);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Erro ao carregar dados' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

### API Calls
```jsx
// ✅ CORRECT
import api from '../api/axios';
const response = await api.get('/endpoint');

// ❌ WRONG
import axios from 'axios';
const response = await axios.get('http://localhost:3000/endpoint');
```

### Authentication
```jsx
// ✅ CORRECT
const { user, hasRole, isAuthenticated } = useAuth();
if (hasRole('TRAINER')) {
  // Trainer-only logic
}

// ❌ WRONG
const user = JSON.parse(localStorage.getItem('user'));
```

### Navigation
```jsx
// ✅ CORRECT
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/profile');

// ❌ WRONG
window.location.href = '/profile';
```

---

## UI/UX Guidelines

The UI follows a **clean, minimalist Material 3 design**. Every interface decision should prioritize clarity, consistency, and immediate user feedback.

**Core Principles:**
- Clean and minimalist — do not overload the screen with information
- Clear visual hierarchy: page title > section title > body > caption
- Generous spacing between sections (`--spacing-xl` between blocks, `--spacing-md` between items)
- Immediate visual feedback on every user action (hover, click, loading, success, error)
- **Never use hardcoded values** — always use design tokens (`--color-*`, `--spacing-*`, `--radius-*`, `--font-*`)
- Transitions on all interactive elements: `0.2s ease` minimum

### Typography Hierarchy

| Level | Variable | Size/Weight | Usage |
|-------|----------|-------------|-------|
| H1 | `--font-h1-size` / `--font-h1-weight` | 24px / 700 | Page title only (1 per page) |
| H2 | `--font-h2-size` / `--font-h2-weight` | 20px / 600 | Card titles, section titles |
| H3 | `--font-h3-size` / `--font-h3-weight` | 18px / 500 | Subtitles within sections |
| Body | `--font-body-size` | 16px / 400 | Default text |
| Body Small | `--font-body-small-size` | 14px / 400 | Secondary text, metadata |
| Caption | `--font-caption-size` | 12px / 400 | Auxiliary labels, timestamps |
| Overline | `--font-overline-size` | 10px / 700 | Section labels (uppercase) |

```jsx
// ✅ CORRECT
<h1 style={{ fontSize: 'var(--font-h1-size)', fontWeight: 'var(--font-h1-weight)' }}>Title</h1>

// ❌ WRONG — never hardcode sizes
<h1 style={{ fontSize: '1.875rem' }}>Title</h1>
```

### Color Usage

| Purpose | Token |
|---------|-------|
| Primary text | `--color-on-surface` |
| Secondary text | `--color-on-surface-variant` |
| Disabled text | `--color-outline` |
| Card backgrounds | `--color-surface` |
| Page background | `--color-surface-container` |
| Primary actions | `--color-primary` / `--color-on-primary` |
| Error states | `--color-error` / `--color-error-container` |
| Success states | `--color-success` / `--color-success-container` |
| Borders | `--color-outline-variant` |
| Gradients | `--color-primary` → `--color-tertiary` |

```jsx
// ✅ CORRECT
color: 'var(--color-on-surface-variant)'

// ❌ WRONG — these variables don't exist
color: 'var(--color-gray-800)'
color: '#60a5fa'
```

### Component Patterns

**Buttons:**
- Every button must have 4 distinct visual states: default, hover (darken 10%), active (darken 15%), disabled (`opacity: 0.6`, `cursor: not-allowed`)
- Use existing classes: `.btn-primary`, `.btn-secondary`, `.btn-edit`, `.btn-delete`, `.btn-schedule-sm`
- Destructive actions always use `--color-error`
- Full-width variant: `.btn-primary-full`
- Button groups: `.btn-group` (flex row with gap)

**Cards:**
- Clickable cards: `.card-link` (hover elevates shadow + subtle translateY)
- Informational cards: `.card`
- Gradient CTA cards: `.card-gradient` / `.card-gradient-link`
- Internal padding: `--spacing-lg` (24px)
- Card header: `.card-header` (flex, space-between)

**Forms:**
- Field structure: `.form-group` > `.form-label` + `.form-input` / `.form-select` / `.form-textarea`
- 2-column layout: use `.grid-responsive-2col` (1 col mobile, 2 col tablet+)
- Focus: blue glow with `--color-primary` (2px)
- Error: border `--color-error` + error message below the field
- Checkbox: `.form-checkbox-row` (inline with label)

**Alerts:**
- Success: `.alert-success` (green) — auto-dismiss after 3 seconds
- Error: `.alert-error` (red) — persistent, with close button (×)
- Compact variant: `.alert-compact`

**Badges:**
- Positive status: `.badge-green`
- Informational: `.badge-blue`
- Negative/destructive: `.badge-red`
- Neutral/disabled: `.badge-gray`
- Role display: `.badge-role`

**Grids:**
- 1→2→3 columns: `.grid-cards` (mobile → tablet → desktop)
- 1→2 columns: `.grid-responsive-2col`
- Auto-fill: `.templates-grid` (minmax 160px mobile, 250px tablet+)

### Page Structure

Every page must follow this structure:

```
1. .page-title or .page-header (title + action buttons)
2. Alerts/messages (if any)
3. Main content (cards, forms, lists)
4. Empty state (when no data — use .empty-state with title + description)
```

```jsx
// ✅ CORRECT page structure
return (
  <div>
    <div className="page-header">
      <h1 className="page-title">Page Title</h1>
      <button className="btn-primary">Action</button>
    </div>

    {message.text && (
      <div className={`alert alert-${message.type}`}>{message.text}</div>
    )}

    {data.length === 0 ? (
      <div className="empty-state">
        <div className="empty-state-title">No items found</div>
        <p>Description of what to do next</p>
      </div>
    ) : (
      <div className="grid-cards">{/* cards */}</div>
    )}
  </div>
);
```

### Loading & Feedback States

- **Page loading:** centered text "Carregando..." using `.loading-screen`
- **Action loading:** button text changes to "Salvando..." + `disabled` attribute
- **Success:** green alert with auto-dismiss (3 seconds)
- **Error:** red alert, persistent, with close button
- **Destructive actions:** always ask confirmation before executing (`window.confirm()`)
- **Form submission:** disable submit button during request to prevent double-click

### Responsive Design

- **Mobile-first:** base styles are always for mobile; scale up with `min-width` media queries
- **Breakpoints:** 768px (tablet), 1024px (desktop)
- **Grids:** 1 col mobile → 2 cols tablet → 3 cols desktop
- **Padding:** `--spacing-md` (16px) mobile, `--spacing-xl` (32px) tablet+
- **Navigation:** bottom nav bar (mobile), sidebar (tablet+)
- **`.page-header`:** always with `flex-wrap: wrap` to prevent overflow
- **Never** use fixed widths that break on 375px screens
- **Never** write `max-width` media queries — always `min-width`

### Spacing Guidelines

| Context | Token | Value |
|---------|-------|-------|
| Between page sections | `--spacing-xl` | 32px |
| Between items in a card | `--spacing-md` | 16px |
| Between inline elements (buttons, badges) | `--spacing-sm` | 8px |
| Card internal padding | `--spacing-lg` | 24px |
| Tight spacing (icon gaps, small elements) | `--spacing-xs` | 4px |

```css
/* ✅ CORRECT */
margin-bottom: var(--spacing-lg);

/* ❌ WRONG — never hardcode */
margin-bottom: 1.5rem;
```

### Accessibility

- Every interactive button and link must have descriptive text or `aria-label`
- Do not use emoji as the sole indicator of an action — always pair with text
- Minimum contrast ratio: 4.5:1 between text and background
- Inputs must have visible labels (not just placeholder)
- All interactive elements must have visible focus indicators
- Color must not be the only way to convey status — pair with text or icons

---

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/signup` - Register new user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password

### User
- `GET /me` - Get current user data
- `PATCH /me/profile` - Update user profile
- `PATCH /become-trainer` - Become a trainer (adds TRAINER role)

### Trainer
- `GET /trainer` - Get trainer profile
- `PATCH /trainer` - Update trainer profile
- `GET /trainer/protocol-templates` - List protocol templates
- `POST /trainer/protocol-templates` - Create protocol template
- `PATCH /trainer/protocol-templates/:id` - Update protocol template
- `DELETE /trainer/protocol-templates/:id` - Delete protocol template
- `GET /trainer/training-templates` - List training templates
- `POST /trainer/training-templates` - Create training template
- `PATCH /trainer/training-templates/:id` - Update training template
- `DELETE /trainer/training-templates/:id` - Delete training template
- `GET /trainer/protocols` - List training protocols
- `POST /trainer/protocols` - Create training protocol
- `GET /trainer/protocols/:id` - Get protocol detail
- `PATCH /trainer/protocols/:id` - Update protocol
- `DELETE /trainer/protocols/:id` - Delete protocol
- `GET /trainer/protocols/:id/trainings` - List trainings in protocol
- `POST /trainer/protocols/:id/trainings` - Create training
- `PATCH /trainer/protocols/:id/trainings/:trainingId` - Update training
- `DELETE /trainer/protocols/:id/trainings/:trainingId` - Delete training
- `POST /trainer/protocols/:id/trainings/:trainingId/schedule` - Schedule training
- `DELETE /trainer/protocols/:id/trainings/:trainingId/schedule/:scheduleId` - Delete schedule

### Utilities
- `GET /postal-code/:cep` - Brazilian postal code (CEP) lookup

---

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Build for staging
npm run build:staging

# Preview production build
npm run preview

# Run linter
npm run lint

# Start production server (serves dist/)
npm start
```

---

## Environment Variables

Create a `.env` file in the project root (use `.env.example` as template):

```env
VITE_API_BASE_URL=http://localhost:3000
```

**Note**: The Axios instance currently uses a hardcoded baseURL. Environment variable support is documented but not yet implemented.

---

## Dependencies

### Runtime
- Backend API must be running at `http://localhost:3000`
- Node.js 24+ required
- CORS must be enabled on the backend for development

### Known Limitations
- Google OAuth not implemented (requires OAuth flow setup)
- Avatar upload not implemented (requires multipart/form-data handling)
- Not production-ready (testing tool only)

---

## UI Language

The user interface is in **Brazilian Portuguese (pt-BR)**. All labels, messages, placeholders, and user-facing text should be in Portuguese. Code, comments, and documentation should be in English.

---

## Additional Notes

- All protected routes must use `<ProtectedRoute>` wrapper
- All authenticated pages must use `<Layout>` wrapper (provides sidebar)
- Role-based features use `hasRole()` from `useAuth()`
- Loading states use `const [loading, setLoading] = useState(false)`
- Messages use `const [message, setMessage] = useState({ type: '', text: '' })`
- Error messages should be user-friendly in Portuguese
- No `console.log` statements in production code (temporary debugging only)
