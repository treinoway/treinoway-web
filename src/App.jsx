import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider } from './contexts/AuthContext';
import { AiChatProvider } from './contexts/AiChatContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import AiRouteGuard from './components/AiRouteGuard';
import AppVersionGate from './components/AppVersionGate';
import TrainerOnlyGate from './components/TrainerOnlyGate';
import NativeBootGate from './components/NativeBootGate';
import NativeIntegrations from './components/NativeIntegrations';
import RouteFallback from './components/RouteFallback';
import WebOnlyRoute from './components/WebOnlyRoute';
import { installPreloadErrorHandler } from './utils/chunkReload';

const PAGE_LOADERS = import.meta.glob(['./pages/**/*.jsx', '!./pages/**/*.test.jsx']);

// Creates a lazily loaded route component for a page path under ./pages (no extension); each page becomes its own chunk.
const lazyPage = (pagePath) => lazy(PAGE_LOADERS[`./pages/${pagePath}.jsx`]);

// Public pages
import Login from './pages/Login';
const Signup = lazyPage('Signup');
const ForgotPassword = lazyPage('ForgotPassword');
const InviteRedeem = lazyPage('InviteRedeem');
const PrivacyPolicy = lazyPage('PrivacyPolicy');
const Terms = lazyPage('Terms');
const AccountDeletion = lazyPage('AccountDeletion');

// Protected pages
const Dashboard = lazyPage('Dashboard');
const Profile = lazyPage('Profile');
const Trainers = lazyPage('Trainers');

// Trainer pages
const TrainingTemplates = lazyPage('trainer/TrainingTemplates');
const ExerciseTemplates = lazyPage('trainer/ExerciseTemplates');
const TrainingTemplateEditor = lazyPage('trainer/TrainingTemplateEditor');
const ExerciseTemplateEditor = lazyPage('trainer/ExerciseTemplateEditor');
const AdvancedTechniques = lazyPage('trainer/AdvancedTechniques');
const Tutorials = lazyPage('trainer/Tutorials');
const TutorialsList = lazyPage('admin/TutorialsList');
const AdvancedTechniqueEditor = lazyPage('trainer/AdvancedTechniqueEditor');
const ProtocolTemplateView = lazyPage('trainer/ProtocolTemplateView');
const ProtocolTemplates = lazyPage('trainer/ProtocolTemplates');
const Students = lazyPage('trainer/Students');
const StudentDetail = lazyPage('trainer/StudentDetail');
const StudentProtocols = lazyPage('trainer/StudentProtocols');
const StudentAnamneses = lazyPage('trainer/StudentAnamneses');
const ExerciseProgressionDetail = lazyPage('trainer/ExerciseProgressionDetail');
const TrainerAnamneses = lazyPage('trainer/TrainerAnamneses');
const AnamnesisDetail = lazyPage('trainer/AnamnesisDetail');
const AssignAnamnesis = lazyPage('trainer/AssignAnamnesis');
const AnamnesisResponseDetail = lazyPage('trainer/AnamnesisResponseDetail');
const TrainerAnamnesisFill = lazyPage('trainer/TrainerAnamnesisFill');
const AiAssistant = lazyPage('trainer/AiAssistant');
const RoutineBuilder = lazyPage('trainer/RoutineBuilder');
const StudentPoints = lazyPage('trainer/StudentPoints');
const Challenges = lazyPage('trainer/Challenges');
const ChallengeDetail = lazyPage('trainer/ChallengeDetail');
const SessionDetail = lazyPage('trainer/SessionDetail');
const Financeiro = lazyPage('trainer/Financeiro');
const SubscriptionHistory = lazyPage('trainer/SubscriptionHistory');

// Nutritionist pages
const NutritionistOnboardingPage = lazyPage('nutritionist/NutritionistOnboardingPage');
const NutritionistPatients = lazyPage('nutritionist/NutritionistPatients');
const DietTemplates = lazyPage('nutritionist/DietTemplates');
const DietProtocols = lazyPage('nutritionist/DietProtocols');
const DietProtocolEditor = lazyPage('nutritionist/DietProtocolEditor');
import NutritionistRoute from './components/NutritionistRoute';
import RequireRole from './components/RequireRole';

// Admin pages
const InvitesList = lazyPage('admin/InvitesList');
const TrainersList = lazyPage('admin/TrainersList');
const AiUsage = lazyPage('admin/AiUsage');

// Student pages (diet)
const MyDietProtocol = lazyPage('my/MyDietProtocol');

const MyProtocols = lazyPage('my/MyProtocols');
const MyAnamneses = lazyPage('my/MyAnamneses');
const AnamnesisWizard = lazyPage('my/AnamnesisWizard');
const MyProtocolDetail = lazyPage('my/MyProtocolDetail');
const WorkoutSessions = lazyPage('my/WorkoutSessions');
const WorkoutSession = lazyPage('my/WorkoutSession');
const MyChallenges = lazyPage('my/MyChallenges');
const MyChallengeDetail = lazyPage('my/MyChallengeDetail');

const RedirectWithId = ({ to }) => {
  const { id } = useParams();
  return <Navigate to={to.replace(':id', id)} replace />;
};

RedirectWithId.propTypes = {
  to: PropTypes.string.isRequired,
};

function App() {
  useEffect(installPreloadErrorHandler, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <ErrorBoundary>
          <AppVersionGate>
          <AuthProvider>
            <NativeBootGate>
            <TrainerOnlyGate>
            <NativeIntegrations />
            <AiChatProvider>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<WebOnlyRoute><Signup /></WebOnlyRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* why: self-guards auth; wrapping in the beta-gated ProtectedRoute would loop */}
          <Route path="/invite" element={<InviteRedeem />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/account-deletion" element={<AccountDeletion />} />

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
            path="/trainer/training-templates/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainingTemplateEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/training-templates/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainingTemplateEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/exercise-templates/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExerciseTemplateEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/exercise-templates/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExerciseTemplateEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/advanced-techniques"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdvancedTechniques />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/tutorials"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tutorials />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/advanced-techniques/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdvancedTechniqueEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/advanced-techniques/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdvancedTechniqueEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
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
            path="/trainer/students/:studentId/anamneses/:anamnesisId/fill"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainerAnamnesisFill />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/ai-assistant"
            element={
              <ProtectedRoute>
                <Layout>
                  <AiRouteGuard>
                    <AiAssistant />
                  </AiRouteGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* why: branding and championship creation are hidden for all trainers during the beta */}
          <Route path="/trainer/branding" element={<Navigate to="/" replace />} />

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
          <Route path="/trainer/challenges/new" element={<Navigate to="/" replace />} />
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
          <Route path="/trainer/championships/create" element={<Navigate to="/" replace />} />

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
          <Route path="/nutritionist/profile" element={<Navigate to="/profile" replace />} />

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
            path="/my/anamneses/:anamnesisId/answer"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnamnesisWizard />
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

          <Route
            path="/admin/invites"
            element={
              <RequireRole roles={['admin']}>
                <Layout>
                  <InvitesList />
                </Layout>
              </RequireRole>
            }
          />
          <Route
            path="/admin/trainers"
            element={
              <RequireRole roles={['admin']}>
                <Layout>
                  <TrainersList />
                </Layout>
              </RequireRole>
            }
          />
          <Route
            path="/admin/ai-usage"
            element={
              <RequireRole roles={['admin']}>
                <Layout>
                  <AiUsage />
                </Layout>
              </RequireRole>
            }
          />
          <Route
            path="/admin/tutorials"
            element={
              <RequireRole roles={['admin']}>
                <Layout>
                  <TutorialsList />
                </Layout>
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
            </Suspense>
            </AiChatProvider>
            </TrainerOnlyGate>
            </NativeBootGate>
          </AuthProvider>
          </AppVersionGate>
        </ErrorBoundary>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
