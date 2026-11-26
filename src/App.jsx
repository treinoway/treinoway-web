import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider } from './contexts/AuthContext';
import { AiChatProvider } from './contexts/AiChatContext';
import { ToastProvider } from './contexts/ToastContext';
import { ResendCooldownProvider } from './contexts/ResendCooldownContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import AiRouteGuard from './components/AiRouteGuard';

// Public pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import InviteRedeem from './pages/InviteRedeem';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import AccountDeletion from './pages/AccountDeletion';

// Protected pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Trainers from './pages/Trainers';

// Trainer pages
import TrainingTemplates from './pages/trainer/TrainingTemplates';
import ExerciseTemplates from './pages/trainer/ExerciseTemplates';
import TrainingTemplateEditor from './pages/trainer/TrainingTemplateEditor';
import ExerciseTemplateEditor from './pages/trainer/ExerciseTemplateEditor';
import AdvancedTechniques from './pages/trainer/AdvancedTechniques';
import Tutorials from './pages/trainer/Tutorials';
import AdvancedTechniqueEditor from './pages/trainer/AdvancedTechniqueEditor';
import ProtocolTemplateView from './pages/trainer/ProtocolTemplateView';
import ProtocolTemplates from './pages/trainer/ProtocolTemplates';
import Students from './pages/trainer/Students';
import StudentDetail from './pages/trainer/StudentDetail';
import StudentProtocols from './pages/trainer/StudentProtocols';
import StudentSessions from './pages/trainer/StudentSessions';
import StudentAnamneses from './pages/trainer/StudentAnamneses';
import ExerciseProgressionDetail from './pages/trainer/ExerciseProgressionDetail';
import TrainerAnamneses from './pages/trainer/TrainerAnamneses';
import AnamnesisDetail from './pages/trainer/AnamnesisDetail';
import AssignAnamnesis from './pages/trainer/AssignAnamnesis';
import AnamnesisResponseDetail from './pages/trainer/AnamnesisResponseDetail';
import TrainerAnamnesisFill from './pages/trainer/TrainerAnamnesisFill';
import AiAssistant from './pages/trainer/AiAssistant';
import RoutineBuilder from './pages/trainer/RoutineBuilder';
import StudentPoints from './pages/trainer/StudentPoints';
import Challenges from './pages/trainer/Challenges';
import ChallengeDetail from './pages/trainer/ChallengeDetail';
import SessionDetail from './pages/trainer/SessionDetail';
import Financeiro from './pages/trainer/Financeiro';
import SubscriptionHistory from './pages/trainer/SubscriptionHistory';
import ConsistencyRanking from './pages/trainer/ConsistencyRanking';
import ConsistencyRankingSettings from './pages/trainer/ConsistencyRankingSettings';
import StudentFeedbacks from './pages/trainer/StudentFeedbacks';
import StudentFeedbackHistory from './pages/trainer/StudentFeedbackHistory';
import StudentFeedbackSettings from './pages/trainer/StudentFeedbackSettings';
import StudentFeedbackTemplates from './pages/trainer/StudentFeedbackTemplates';
import StudentFeedbackTemplateBuilder from './pages/trainer/StudentFeedbackTemplateBuilder';

// Nutritionist pages
import Patients from './pages/nutritionist/Patients';
import PlanSummary from './pages/nutritionist/PlanSummary';
import PrescriptionGoals from './pages/nutritionist/PrescriptionGoals';
import PrescriptionMenu from './pages/nutritionist/PrescriptionMenu';
import PrescriptionGuidance from './pages/nutritionist/PrescriptionGuidance';
import MyFoods from './pages/nutritionist/MyFoods';
import NutritionistRoute from './components/NutritionistRoute';
import RequireRole from './components/RequireRole';
import useConsistencyRankingAccess from './hooks/useConsistencyRankingAccess';
import useStudentFeedbackAccess from './hooks/useStudentFeedbackAccess';
import { t } from './i18n';


// Student pages

import MyProtocols from './pages/my/MyProtocols';
import MyAnamneses from './pages/my/MyAnamneses';
import AnamnesisWizard from './pages/my/AnamnesisWizard';
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

// Renders the Ranking de Constância route only when the rollout gate allows it, otherwise sends the user home.
const ConsistencyRankingRoute = ({ children }) => {
  const canSeeConsistencyRanking = useConsistencyRankingAccess();
  if (!canSeeConsistencyRanking) return <Navigate to="/" replace />;
  return children;
};

ConsistencyRankingRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Renders a student feedback route only when the rollout gate allows it, otherwise sends the user home.
const StudentFeedbackRoute = ({ children }) => {
  const canSeeStudentFeedback = useStudentFeedbackAccess();
  if (!canSeeStudentFeedback) return <Navigate to="/" replace />;
  return children;
};

StudentFeedbackRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Old /trainer/financeiro URL: keeps the query string (?status=overdue from the dashboard link).
const RedirectFinanceiro = () => {
  const { search } = useLocation();
  return <Navigate to={`/financeiro${search}`} replace />;
};

// Old trainer-only person history URL.
const RedirectFinanceHistory = () => {
  const { studentId } = useParams();
  return <Navigate to={`/financeiro/alunos/${studentId}`} replace />;
};

// Former /admin/* screens, now under /manager/*; the old URLs redirect so bookmarks keep working.
const MOVED_ADMIN_SECTIONS = ['invites', 'feedbacks', 'trainers', 'ai-usage', 'tutorials'];

// Backoffice route subtree, split into its own chunk.
const ManagerApp = lazy(() => import('./manager/ManagerApp'));

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <ResendCooldownProvider>
        <ErrorBoundary>
          <AuthProvider>
            <AiChatProvider>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
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
            path="/trainer/students/:id/sessions"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentSessions />
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

          <Route path="/trainer/financeiro" element={<RedirectFinanceiro />} />
          <Route path="/trainer/students/:studentId/subscription-history" element={<RedirectFinanceHistory />} />

          <Route
            path="/financeiro"
            element={
              <ProtectedRoute>
                <RequireRole roles={['TRAINER', 'NUTRITIONIST']}>
                  <Layout>
                    <Financeiro />
                  </Layout>
                </RequireRole>
              </ProtectedRoute>
            }
          />

          <Route
            path="/financeiro/alunos/:studentId"
            element={
              <ProtectedRoute>
                <RequireRole roles={['TRAINER', 'NUTRITIONIST']}>
                  <Layout>
                    <SubscriptionHistory />
                  </Layout>
                </RequireRole>
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
          <Route
            path="/trainer/consistency-ranking"
            element={
              <ProtectedRoute>
                <ConsistencyRankingRoute>
                  <Layout>
                    <ConsistencyRanking />
                  </Layout>
                </ConsistencyRankingRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/consistency-ranking/settings"
            element={
              <ProtectedRoute>
                <ConsistencyRankingRoute>
                  <Layout>
                    <ConsistencyRankingSettings />
                  </Layout>
                </ConsistencyRankingRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/student-feedbacks"
            element={
              <ProtectedRoute>
                <StudentFeedbackRoute>
                  <Layout>
                    <StudentFeedbacks />
                  </Layout>
                </StudentFeedbackRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/student-feedbacks/settings"
            element={
              <ProtectedRoute>
                <StudentFeedbackRoute>
                  <Layout>
                    <StudentFeedbackSettings />
                  </Layout>
                </StudentFeedbackRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/student-feedbacks/templates"
            element={
              <ProtectedRoute>
                <StudentFeedbackRoute>
                  <Layout>
                    <StudentFeedbackTemplates />
                  </Layout>
                </StudentFeedbackRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/student-feedbacks/templates/:id"
            element={
              <ProtectedRoute>
                <StudentFeedbackRoute>
                  <Layout>
                    <StudentFeedbackTemplateBuilder />
                  </Layout>
                </StudentFeedbackRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/students/:id/feedbacks"
            element={
              <ProtectedRoute>
                <StudentFeedbackRoute>
                  <Layout>
                    <StudentFeedbackHistory />
                  </Layout>
                </StudentFeedbackRoute>
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
            path="/nutritionist/patients"
            element={
              <NutritionistRoute>
                <Layout>
                  <Patients />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/patients/:patientId/plan"
            element={
              <NutritionistRoute>
                <Layout>
                  <PlanSummary />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/patients/:patientId/plan/goals"
            element={
              <NutritionistRoute>
                <Layout>
                  <PrescriptionGoals />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/patients/:patientId/plan/menu"
            element={
              <NutritionistRoute>
                <Layout>
                  <PrescriptionMenu />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/patients/:patientId/plan/guidance"
            element={
              <NutritionistRoute>
                <Layout>
                  <PrescriptionGuidance />
                </Layout>
              </NutritionistRoute>
            }
          />
          <Route
            path="/nutritionist/foods"
            element={
              <NutritionistRoute>
                <Layout>
                  <MyFoods />
                </Layout>
              </NutritionistRoute>
            }
          />

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
            path="/my/workout-sessions/:sessionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkoutSession />
                </Layout>
              </ProtectedRoute>
            }
          />

          {MOVED_ADMIN_SECTIONS.map((section) => (
            <Route
              key={section}
              path={`/admin/${section}`}
              element={<Navigate to={`/manager/${section}`} replace />}
            />
          ))}

          <Route
            path="/manager/*"
            element={
              <RequireRole roles={['admin']}>
                <Suspense
                  fallback={
                    <div className="loading-screen">
                      <span className="loading-text type-body">{t('manager.loading')}</span>
                    </div>
                  }
                >
                  <ManagerApp />
                </Suspense>
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
            </AiChatProvider>
          </AuthProvider>
        </ErrorBoundary>
        </ResendCooldownProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
