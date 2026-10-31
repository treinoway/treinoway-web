# Treinoway Web - React Test App

A lightweight React SPA for manually testing the Treinoway backend API.

## Tech Stack

- **Vite + React 19** - Fast development setup
- **React Router v7** - Navigation and routing
- **Tailwind CSS v4** - Modern, clean UI
- **Axios** - HTTP requests with interceptors (auto-attach JWT, auto-refresh tokens)
- **React Context** - Auth state management

## Features

### Authentication
- Email/password login and signup
- JWT token management with automatic refresh
- Protected routes

### User Profile
- View and edit profile information
- Change password
- Become a trainer

### Trainer Features (requires TRAINER role)
- Trainer profile management
- Protocol template CRUD
- Training template CRUD
- Training protocol CRUD
- Training management within protocols
- Training scheduling

### Student Features
- View assigned protocols
- View protocol details and trainings
- View training schedules

## Getting Started

### Prerequisites

- Node.js 24+
- Backend API running on `http://localhost:3000`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Project Structure

```
src/
  api/
    axios.js          # Axios instance with interceptors
  contexts/
    AuthContext.jsx   # Auth state, login, logout, refresh
  components/
    Layout.jsx        # Sidebar + main content
    ProtectedRoute.jsx
  pages/
    Login.jsx
    Signup.jsx
    Dashboard.jsx
    Profile.jsx
    trainer/
      TrainerProfile.jsx
      ProtocolTemplates.jsx
      TrainingProtocols.jsx
      ProtocolDetail.jsx
      TrainingTemplates.jsx
    my/
      MyProtocols.jsx
      MyProtocolDetail.jsx
  App.jsx
  main.jsx
```

## API Endpoints Covered

- `POST /auth/login` - Login
- `POST /auth/signup` - Signup
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/change-password` - Change password
- `GET /me` - Get current user
- `PATCH /me/profile` - Update profile
- `PATCH /me/become-trainer` - Become a trainer
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
- `PATCH /trainer/protocols/:id` - Update training protocol
- `DELETE /trainer/protocols/:id` - Delete training protocol
- `GET /trainer/protocols/:id/trainings` - List trainings in protocol
- `POST /trainer/protocols/:id/trainings` - Create training
- `PATCH /trainer/protocols/:id/trainings/:trainingId` - Update training
- `DELETE /trainer/protocols/:id/trainings/:trainingId` - Delete training
- `POST /trainer/protocols/:id/trainings/:trainingId/schedule` - Schedule training
- `DELETE /trainer/protocols/:id/trainings/:trainingId/schedule/:scheduleId` - Delete schedule
- `GET /my/protocols` - List my protocols
- `GET /my/protocols/:id` - Get my protocol detail

## Notes

- This is a **testing tool only**, not production-ready
- No Google OAuth implementation (requires redirect flow setup)
- Avatar upload not implemented (requires multipart/form-data handling)
- Backend must be running on `http://localhost:3000`
- CORS is enabled in the backend for development

## App nativo (Teufit Coach, Capacitor)

- `npm run build:app` gera o bundle do app (modo Vite `app`, que não carrega `.env.production`). Variáveis do processo vencem; veja `.env.app.example`.
- **Release só sai por `npm run build:app:release`**: build, `cap sync` com `CAP_DEV_*` removidas e `check:native-release` encadeados. Ele exige `VITE_API_BASE_URL` definido e https (lido como o Vite lê, inclusive `.env` e `.env.local`), sem cleartext, sem mixed content, sem depuração remota e sem URL de LAN no bundle. O CI roda esse caminho (passo "Native release guard" em `.github/workflows/test.yml`). Não gere builds de loja com `cap sync` solto.
- Build de debug em LAN (só para teste): `VITE_API_BASE_URL=http://<ip>:3000 npm run build:app`, depois `CAP_DEV_ALLOW_LAN_HTTP=true CAP_DEV_WEB_DEBUGGING=true npm run cap:sync` e `CAP_DEV_ALLOW_LAN_HTTP=true ./gradlew assembleDebug` em `android/`. Depois, volte os projetos ao estado de release com `npm run build:app:release`.
- Critério 7 (larguras da bottom nav): `E2E_PORT=5199 npx playwright test e2e/bottom-nav.spec.js`.
