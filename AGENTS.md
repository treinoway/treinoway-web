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
│   │   │   ├── ProtocolTemplates.jsx
│   │   │   ├── TrainingTemplates.jsx
│   │   │   ├── TrainingProtocols.jsx
│   │   │   └── ProtocolDetail.jsx
│   │   └── my/                   # Student pages
│   │       ├── MyProtocols.jsx
│   │       └── MyProtocolDetail.jsx
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
- `/trainer/protocol-templates` - Protocol template CRUD
- `/trainer/training-templates` - Training template CRUD
- `/trainer/protocols` - Training protocol list
- `/trainer/protocols/:id` - Protocol detail with trainings

### Student Routes
- `/my/protocols` - List of assigned protocols
- `/my/protocols/:id` - Protocol detail view

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

### Student
- `GET /my/protocols` - List my assigned protocols
- `GET /my/protocols/:id` - Get my protocol detail

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
