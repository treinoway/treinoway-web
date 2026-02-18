import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, ClipboardList, Dumbbell, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
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
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinks = [
    { path: '/', label: 'Painel', Icon: Home },
    { path: '/profile', label: 'Meu Perfil', Icon: User },
    ...(hasRole('TRAINER') ? [
      { path: '/trainer/protocols', label: 'Protocolos', Icon: ClipboardList, section: 'Treinador' },
      { path: '/trainer/training-templates', label: 'Treinos', Icon: Dumbbell, section: 'Treinador' },
    ] : []),
  ];

  return (
    <div className="app-layout">
      {/* Top App Bar — visible only on mobile */}
      <div className="top-app-bar">
        <img
          src="/img/treino_way_transparente.png"
          alt="Treinoway"
          className="top-app-bar-logo"
        />
        <span className="top-app-bar-user">{user?.name}</span>
      </div>

      {/* Sidebar — visible only on tablet+ */}
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
              aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen
                ? <ChevronLeft size={16} strokeWidth={1.6} />
                : <ChevronRight size={16} strokeWidth={1.6} />
              }
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((link, index) => {
            const showSection = link.section && sidebarOpen &&
              (index === 0 || navLinks[index - 1].section !== link.section);

            return (
              <div key={link.path}>
                {showSection && (
                  <div className="sidebar-section-label">
                    {link.section}
                  </div>
                )}
                <Link
                  to={link.path}
                  className={`sidebar-link ${isActive(link.path) ? 'sidebar-link--active' : ''}`}
                  aria-label={link.label}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    <link.Icon size={20} strokeWidth={1.6} />
                  </span>
                  {sidebarOpen && <span className="sidebar-link-label">{link.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className={!sidebarOpen ? 'hidden' : ''} aria-hidden={!sidebarOpen}>
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="btn-logout" aria-label="Sair da conta">
            <LogOut size={18} strokeWidth={1.6} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="main-content-inner">{children}</div>
      </main>

      {/* Bottom Navigation — visible only on mobile */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        {navLinks.filter(link => !link.section || link.path === '/trainer/protocols').map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`bottom-nav-item ${isActive(link.path) ? 'bottom-nav-item--active' : ''}`}
            aria-label={link.label}
          >
            <span className="bottom-nav-item-icon" aria-hidden="true">
              <link.Icon size={22} strokeWidth={1.6} />
            </span>
            <span>{link.label}</span>
          </Link>
        ))}
        <button onClick={handleLogout} className="bottom-nav-item bottom-nav-logout" aria-label="Sair da conta">
          <span className="bottom-nav-item-icon" aria-hidden="true">
            <LogOut size={22} strokeWidth={1.6} />
          </span>
          <span>Sair</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
