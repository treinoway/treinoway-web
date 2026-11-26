import { Routes, Route, Navigate } from 'react-router-dom';
import ManagerLayout from './ManagerLayout';
import Overview from './pages/Overview';
import UsersList from './pages/UsersList';
import UserDetail from './pages/UserDetail';
import ProtocolDetail from './pages/ProtocolDetail';
import SessionDetail from './pages/SessionDetail';
import TrainersList from '../pages/admin/TrainersList';
import InvitesList from '../pages/admin/InvitesList';
import FeedbackList from '../pages/admin/FeedbackList';
import AiUsage from '../pages/admin/AiUsage';
import TutorialsList from '../pages/admin/TutorialsList';

// Backoffice route subtree mounted at /manager/* (lazy-loaded from App).
const ManagerApp = () => (
  <ManagerLayout>
    <Routes>
      <Route index element={<Overview />} />
      <Route path="users" element={<UsersList />} />
      <Route path="users/:userId" element={<UserDetail />} />
      <Route path="protocols/:protocolId" element={<ProtocolDetail />} />
      <Route path="sessions/:sessionId" element={<SessionDetail />} />
      <Route path="trainers" element={<TrainersList />} />
      <Route path="invites" element={<InvitesList />} />
      <Route path="feedbacks" element={<FeedbackList />} />
      <Route path="ai-usage" element={<AiUsage />} />
      <Route path="tutorials" element={<TutorialsList />} />
      <Route path="*" element={<Navigate to="/manager" replace />} />
    </Routes>
  </ManagerLayout>
);

export default ManagerApp;
