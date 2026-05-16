import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider } from './contexts/AuthContext';
import { AiChatProvider } from './contexts/AiChatContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Public pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Protected pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Trainers from './pages/Trainers';

// Trainer pages
import TrainingTemplates from './pages/trainer/TrainingTemplates';
import ExerciseTemplates from './pages/trainer/ExerciseTemplates';
import ProtocolTemplateView from './pages/trainer/ProtocolTemplateView';
import ProtocolTemplates from './pages/trainer/ProtocolTemplates';
import Students from './pages/trainer/Students';
import StudentDetail from './pages/trainer/StudentDetail';
import StudentProtocols from './pages/trainer/StudentProtocols';
import StudentAnamneses from './pages/trainer/StudentAnamneses';
import ExerciseProgressionDetail from './pages/trainer/ExerciseProgressionDetail';
import TrainerAnamneses from './pages/trainer/TrainerAnamneses';
import AnamnesisDetail from './pages/trainer/AnamnesisDetail';
import AssignAnamnesis from './pages/trainer/AssignAnamnesis';
import AnamnesisResponseDetail from './pages/trainer/AnamnesisResponseDetail';
import AiAssistant from './pages/trainer/AiAssistant';
import TrainerBranding from './pages/trainer/TrainerBranding';
import RoutineBuilder from './pages/trainer/RoutineBuilder';
import StudentPoints from './pages/trainer/StudentPoints';
import Challenges from './pages/trainer/Challenges';
import CreateChallenge from './pages/trainer/CreateChallenge';
import ChallengeDetail from './pages/trainer/ChallengeDetail';
import CreateChampionship from './pages/trainer/CreateChampionship';
import SessionDetail from './pages/trainer/SessionDetail';
import Financeiro from './pages/trainer/Financeiro';
import SubscriptionHistory from './pages/trainer/SubscriptionHistory';

// Nutritionist pages
import NutritionistOnboardingPage from './pages/nutritionist/NutritionistOnboardingPage';
import NutritionistPatients from './pages/nutritionist/NutritionistPatients';
import DietTemplates from './pages/nutritionist/DietTemplates';
import DietProtocols from './pages/nutritionist/DietProtocols';
import DietProtocolEditor from './pages/nutritionist/DietProtocolEditor';
import NutritionistRoute from './components/NutritionistRoute';
import RequireRole from './components/RequireRole';

// Admin pages
import VideosList from './pages/admin/VideosList';
import VideoCreate from './pages/admin/VideoCreate';
import VideoEdit from './pages/admin/VideoEdit';

// Student pages (diet)
import MyDietProtocol from './pages/my/MyDietProtocol';

import MyProtocols from './pages/my/MyProtocols';
import MyAnamneses from './pages/my/MyAnamneses';
import MyProtocolDetail from './pages/my/MyProtocolDetail';
import WorkoutSessions from './pages/my/WorkoutSessions';
import WorkoutSession from './pages/my/WorkoutSession';
import MyChallenges from './pages/my/MyChallenges';
import MyChallengeDetail from './pages/my/MyChallengeDetail';

const RedirectWithId = ({ to }) => {
  const { id } = useParams();
  return <Navigate to={to.replace(':id', id)} replace />;
};

RedirectWithId.propTypes = {
  to: PropTypes.string.isRequired,
};

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ErrorBoundary>
          <AuthProvider>
            <AiChatProvider>
            <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Trainers />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Trainer routes */}
          <Route
            path="/trainer/training-templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainingTemplates />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/exercise-templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExerciseTemplates />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* ── Routines ── */}
          <Route
            path="/trainer/routines"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProtocolTemplates />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/routines/new"
            element={
              <ProtectedRoute>
                <Layout noPadding>
                  <RoutineBuilder />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/routines/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProtocolTemplateView />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/routines/:id/edit"
            element={
              <ProtectedRoute>
                <Layout noPadding>
                  <RoutineBuilder />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* ── Backwards-compat redirects from legacy /trainer/protocol-templates URLs ── */}
          <Route path="/trainer/protocol-templates" element={<Navigate to="/trainer/routines" replace />} />
          <Route path="/trainer/protocol-templates/new" element={<Navigate to="/trainer/routines/new" replace />} />
          <Route path="/trainer/protocol-templates/:id" element={<RedirectWithId to="/trainer/routines/:id" />} />
          <Route path="/trainer/protocol-templates/:id/edit" element={<RedirectWithId to="/trainer/routines/:id/edit" />} />

          <Route
            path="/trainer/protocols/new"
            element={
              <ProtectedRoute>
                <Layout noPadding>
                  <RoutineBuilder />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/protocols/:id"
            element={
              <ProtectedRoute>
                <Layout noPadding>
                  <RoutineBuilder />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/protocols/:id/edit"
            element={
              <ProtectedRoute>
                <Layout noPadding>
                  <RoutineBuilder />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/students"
            element={
              <ProtectedRoute>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/students/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/students/:studentId/sessions/:sessionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <SessionDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/students/:id/protocols"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentProtocols />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/students/:id/anamneses"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentAnamneses />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/students/:studentId/exercises/:exerciseId/progression"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExerciseProgressionDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/anamneses"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainerAnamneses />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/anamneses/:anamnesisId"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnamnesisDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/anamneses/:anamnesisId/assign"
            element={
              <ProtectedRoute>
                <Layout>
                  <AssignAnamnesis />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/students/:studentId/anamneses/:anamnesisId/response"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnamnesisResponseDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/ai-assistant"
            element={
              <ProtectedRoute>
                <Layout>
                  <AiAssistant />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/branding"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainerBranding />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/financeiro"
            element={
              <ProtectedRoute>
                <Layout>
                  <Financeiro />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/students/:studentId/subscription-history"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubscriptionHistory />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="/trainer/gamification" element={<Navigate to="/trainer/challenges" replace />} />

          {/* Redirects for removed pages */}
          <Route path="/trainer/competition" element={<Navigate to="/trainer/challenges" replace />} />
          <Route path="/trainer/ranking" element={<Navigate to="/trainer/challenges" replace />} />
          <Route path="/my/ranking" element={<Navigate to="/my/challenges" replace />} />
          <Route path="/my/points" element={<Navigate to="/my/challenges" replace />} />

          <Route
            path="/trainer/students/:studentId/points"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentPoints />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/challenges"
            element={
              <ProtectedRoute>
                <Layout>
                  <Challenges />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/challenges/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateChallenge />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/challenges/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChallengeDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/championships/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateChampionship />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Nutritionist routes */}
          <Route
            path="/nutritionist/onboarding"
            element={
              <NutritionistRoute>
                <Layout>
                  <NutritionistOnboardingPage />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/patients"
            element={
              <NutritionistRoute>
                <Layout>
                  <NutritionistPatients />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/diet-templates"
            element={
              <NutritionistRoute>
                <Layout>
                  <DietTemplates />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/diet-protocols"
            element={
              <NutritionistRoute>
                <Layout>
                  <DietProtocols />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/diet-protocols/:id/edit"
            element={
              <NutritionistRoute>
                <Layout>
                  <DietProtocolEditor />
                </Layout>
              </NutritionistRoute>
            }
          />
          {/* Redirect removed nutritionist profile page to unified profile */}
          <Route path="/nutritionist/profile" element={<Navigate to="/profile" replace />} />

          {/* Student routes */}
          <Route
            path="/my/protocols"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyProtocols />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my/protocols/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyProtocolDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my/workout-sessions"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkoutSessions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my/anamneses"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyAnamneses />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/my/challenges"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyChallenges />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my/challenges/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyChallengeDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my/diet"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyDietProtocol />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/my/workout-sessions/:sessionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkoutSession />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/videos"
            element={
              <RequireRole roles={['admin']}>
                <Layout>
                  <VideosList />
                </Layout>
              </RequireRole>
            }
          />
          <Route
            path="/admin/videos/new"
            element={
              <RequireRole roles={['admin']}>
                <Layout>
                  <VideoCreate />
                </Layout>
              </RequireRole>
            }
          />
          <Route
            path="/admin/videos/:videoId"
            element={
              <RequireRole roles={['admin']}>
                <Layout>
                  <VideoEdit />
                </Layout>
              </RequireRole>
            }
          />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
            </AiChatProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
