import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import ProtocolDetail from './pages/trainer/ProtocolDetail';
import ProtocolTemplates from './pages/trainer/ProtocolTemplates';
import CreateProtocol from './pages/trainer/CreateProtocol';
import Students from './pages/trainer/Students';
import StudentDetail from './pages/trainer/StudentDetail';
import TrainerAnamneses from './pages/trainer/TrainerAnamneses';
import AnamnesisDetail from './pages/trainer/AnamnesisDetail';
import AiAssistant from './pages/trainer/AiAssistant';
import TrainerBranding from './pages/trainer/TrainerBranding';
import StudentPoints from './pages/trainer/StudentPoints';
import Challenges from './pages/trainer/Challenges';
import CreateChallenge from './pages/trainer/CreateChallenge';
import ChallengeDetail from './pages/trainer/ChallengeDetail';
import CreateChampionship from './pages/trainer/CreateChampionship';

// Student pages
import MyProtocols from './pages/my/MyProtocols';
import MyAnamneses from './pages/my/MyAnamneses';
import MyProtocolDetail from './pages/my/MyProtocolDetail';
import WorkoutSessions from './pages/my/WorkoutSessions';
import WorkoutSession from './pages/my/WorkoutSession';
import MyChallenges from './pages/my/MyChallenges';
import MyChallengeDetail from './pages/my/MyChallengeDetail';

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
          <Route
            path="/trainer/protocol-templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProtocolTemplates />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/protocols/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateProtocol />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/protocols/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProtocolDetail />
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
            path="/trainer/ai-assistant"
            element={
              <ProtectedRoute>
                <Layout noPadding>
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
            path="/my/workout-sessions/:sessionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkoutSession />
                </Layout>
              </ProtectedRoute>
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
