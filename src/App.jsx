import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Public pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Protected pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

// Trainer pages
import TrainingTemplates from './pages/trainer/TrainingTemplates';
import TrainingProtocols from './pages/trainer/TrainingProtocols';
import ProtocolDetail from './pages/trainer/ProtocolDetail';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            path="/trainer/protocols"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainingProtocols />
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

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
