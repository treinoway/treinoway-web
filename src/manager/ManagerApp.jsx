import { Routes, Route, Navigate } from 'react-router-dom';
import ManagerLayout from './ManagerLayout';
import UsersList from './pages/UsersList';
import UserDetail from './pages/UserDetail';
import ProtocolDetail from './pages/ProtocolDetail';
import SessionDetail from './pages/SessionDetail';

// Backoffice route subtree mounted at /manager/* (lazy-loaded from App).
const ManagerApp = () => (
  <ManagerLayout>
    <Routes>
      <Route index element={<UsersList />} />
      <Route path="users/:userId" element={<UserDetail />} />
      <Route path="protocols/:protocolId" element={<ProtocolDetail />} />
      <Route path="sessions/:sessionId" element={<SessionDetail />} />
      <Route path="*" element={<Navigate to="/manager" replace />} />
    </Routes>
  </ManagerLayout>
);

export default ManagerApp;
