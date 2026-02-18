import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinks = [
    { path: '/', label: 'Painel', icon: '🏠' },
    { path: '/profile', label: 'Meu Perfil', icon: '👤' },
  ];

  if (hasRole('TRAINER')) {
    navLinks.push(
      { path: '/trainer', label: 'Perfil do Treinador', icon: '💪', section: 'Treinador' }
    );
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-inner">
            {sidebarOpen ? (
              <img
                src="/img/treino_way_transparente.png"
                alt="Treinoway"
                className="sidebar-logo"
              />
            ) : (
              <img
                src="/img/treinoway.ico"
                alt="Treinoway"
                className="sidebar-logo-icon"
              />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((link, index) => {
            if (link.section && sidebarOpen) {
              return (
                <div key={link.path}>
                  {index > 0 && navLinks[index - 1].section !== link.section && (
                    <div className="sidebar-section-label">
                      {link.section}
                    </div>
                  )}
                  <Link
                    to={link.path}
                    className={`sidebar-link ${isActive(link.path) ? 'sidebar-link--active' : ''}`}
                  >
                    <span className="sidebar-link-icon">{link.icon}</span>
                    {sidebarOpen && <span className="sidebar-link-label">{link.label}</span>}
                  </Link>
                </div>
              );
            }
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`sidebar-link ${isActive(link.path) ? 'sidebar-link--active' : ''}`}
              >
                <span className="sidebar-link-icon">{link.icon}</span>
                {sidebarOpen && <span className="sidebar-link-label">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className={!sidebarOpen ? 'hidden' : ''}>
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
            {user?.roles && user.roles.length > 0 && (
              <div className="sidebar-roles">
                {user.roles.map((role) => (
                  <span key={role} className="sidebar-role-badge">
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="btn-logout">
            {sidebarOpen ? 'Sair' : '🚪'}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="main-content-inner">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
