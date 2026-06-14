import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, BookOpen, ClipboardList, Dumbbell, Activity, Users, LogOut, ChevronDown, FileText, Sparkles, Palette, Trophy, PanelLeft, Salad, Utensils, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import useActiveMode from '../hooks/useActiveMode';
import useFinanceiroBadge from '../hooks/useFinanceiroBadge';
import { t } from '../i18n';

const BIBLIOTECA_PATHS = ['/trainer/routines', '/trainer/training-templates', '/trainer/exercise-templates', '/trainer/anamneses'];

const Layout = ({ children, noPadding = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false); // closed by default; auto-opens on active route via useEffect
  const [bibliotecaPopover, setBibliotecaPopover] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const { loading: aiLoading, hasNewResponse: aiHasNewResponse } = useAiChat();
  const showAi = user?.email !== 'gabriel.araujo.lima2011@gmail.com';
  const location = useLocation();
  const navigate = useNavigate();
  const popoverRef = useRef(null);
  const [activeMode, setActiveMode] = useActiveMode();
  const isDualRole = hasRole('TRAINER') && hasRole('NUTRITIONIST');
  const trainerActive = hasRole('TRAINER') && (!isDualRole || activeMode === 'trainer');
  const { count: financeiroBadgeCount } = useFinanceiroBadge({ enabled: trainerActive });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isBibliotecaActive = () =>
    BIBLIOTECA_PATHS.some((p) => isActive(p));

  // Auto-open sidebar biblioteca group when a child route is active
  useEffect(() => {
    if (isBibliotecaActive()) {
      setBibliotecaOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Auto-switch mode based on current path
  useEffect(() => {
    if (location.pathname.startsWith('/nutritionist/')) {
      setActiveMode('nutritionist');
    } else if (location.pathname.startsWith('/trainer/')) {
      setActiveMode('trainer');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close mobile popover on outside click
  useEffect(() => {
    if (!bibliotecaPopover) return;
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setBibliotecaPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [bibliotecaPopover]);

  const bibliotecaChildren = [
    { path: '/trainer/routines', label: 'Rotinas', Icon: ClipboardList },
    { path: '/trainer/training-templates', label: 'Treinos únicos', Icon: Dumbbell },
    { path: '/trainer/exercise-templates', label: 'Exercícios', Icon: Activity },
    { path: '/trainer/anamneses', label: 'Anamneses', Icon: FileText },
  ];

  const isStudentUser = user?.email === 'n.santos1897@gmail.com';

  const getPlanBadgeClass = (tier) => {
    if (tier === 'PRO') return 'badge badge-blue';
    if (tier === 'PLATINUM' || tier === 'DIAMOND') return 'badge badge-accent';
    return 'badge badge-gray';
  };

  const navLinks = [
    { path: '/', label: 'Painel', Icon: Home },
    { path: '/profile', label: 'Meu Perfil', Icon: User },
    ...(isStudentUser ? [
      { path: '/my/protocols', label: 'Minhas Rotinas', Icon: ClipboardList },
      { path: '/my/diet', label: 'Minha Dieta', Icon: Utensils },
      { path: '/my/anamneses', label: 'Anamneses', Icon: FileText },
      { path: '/my/challenges', label: 'Campeonatos', Icon: Trophy },
    ] : []),
  ];

  return (
    <div className={`app-layout${noPadding ? ' app-layout--fullscreen' : ''}`}>
      {/* Top App Bar — visible only on mobile */}
      <div className="top-app-bar">
        <img
          src="/img/treino_way_transparente.png"
          alt="Treinoway"
          className="top-app-bar-logo"
        />
        <span className="top-app-bar-user">{user?.firstName}</span>
      </div>

      {/* Sidebar — visible only on tablet+ */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-inner">
            <button
              type="button"
              className="sidebar-logo-btn"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
              aria-expanded={sidebarOpen}
            >
              <img src="/img/treinoway.ico" alt="Treinoway" className="sidebar-logo-icon" />
            </button>
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Recolher menu lateral"
              tabIndex={sidebarOpen ? 0 : -1}
            >
              <PanelLeft size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Mode switcher — only for dual-role users (TRAINER + NUTRITIONIST) */}
          {isDualRole && sidebarOpen && (
            <div className="segmented-toggle segmented-toggle--mode-switch" role="group" aria-label="Alternar modo">
              <button
                type="button"
                className={`segmented-toggle-btn${activeMode === 'trainer' ? ' segmented-toggle-btn--active' : ''}`}
                onClick={() => setActiveMode('trainer')}
                aria-pressed={activeMode === 'trainer'}
              >
                <Dumbbell size={18} strokeWidth={2} />
                <span>Treinador</span>
              </button>
              <button
                type="button"
                className={`segmented-toggle-btn${activeMode === 'nutritionist' ? ' segmented-toggle-btn--active' : ''}`}
                onClick={() => setActiveMode('nutritionist')}
                aria-pressed={activeMode === 'nutritionist'}
              >
                <Salad size={18} strokeWidth={2} />
                <span>Nutricionista</span>
              </button>
            </div>
          )}

          {/* Regular nav links */}
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${isActive(link.path) ? 'sidebar-link--active' : ''}`}
              aria-label={link.label}
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                <link.Icon size={20} strokeWidth={1.6} />
              </span>
              <span className="sidebar-link-label">{link.label}</span>
            </Link>
          ))}

          {/* Nutritionist section — hidden when dual-role and trainer mode is active */}
          {hasRole('NUTRITIONIST') && (!isDualRole || activeMode === 'nutritionist') && (
            <>
              <div className="sidebar-section-label">Nutricionista</div>
              <Link
                to="/nutritionist/patients"
                className={`sidebar-link ${isActive('/nutritionist/patients') ? 'sidebar-link--active' : ''}`}
                aria-label="Pacientes"
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <Users size={20} strokeWidth={1.6} />
                </span>
                <span className="sidebar-link-label">Pacientes</span>
              </Link>
              <Link
                to="/nutritionist/diet-protocols"
                className={`sidebar-link ${isActive('/nutritionist/diet-protocols') ? 'sidebar-link--active' : ''}`}
                aria-label="Protocolos"
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <ClipboardList size={20} strokeWidth={1.6} />
                </span>
                <span className="sidebar-link-label">Protocolos</span>
              </Link>
              <Link
                to="/nutritionist/diet-templates"
                className={`sidebar-link ${isActive('/nutritionist/diet-templates') ? 'sidebar-link--active' : ''}`}
                aria-label="Modelos de Dieta"
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <Salad size={20} strokeWidth={1.6} />
                </span>
                <span className="sidebar-link-label">Modelos</span>
              </Link>
            </>
          )}

          {/* Trainer section — hidden when dual-role and nutritionist mode is active */}
          {hasRole('TRAINER') && (!isDualRole || activeMode === 'trainer') && (
            <>
              <div className="sidebar-section-label">Treinador</div>

              {/* Alunos — direct link (no dropdown needed) */}
              <Link
                to="/trainer/students"
                className={`sidebar-link ${isActive('/trainer/students') ? 'sidebar-link--active' : ''}`}
                aria-label="Meus Alunos"
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <Users size={20} strokeWidth={1.6} />
                </span>
                <span className="sidebar-link-label">Meus Alunos</span>
              </Link>

              {/* iArnold */}
              {showAi && (
                <Link
                  to="/trainer/ai-assistant"
                  className={`sidebar-link ${isActive('/trainer/ai-assistant') ? 'sidebar-link--active' : ''}`}
                  aria-label="iArnold"
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    <Sparkles size={20} strokeWidth={1.6} />
                  </span>
                  <>
                    <span className="sidebar-link-label">iArnold</span>
                    <span className="sidebar-link-badge">IA</span>
                  </>
                </Link>
              )}

              {/* Campeonatos */}
              <Link
                to="/trainer/challenges"
                className={`sidebar-link ${isActive('/trainer/challenges') ? 'sidebar-link--active' : ''}`}
                aria-label="Campeonatos"
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <Trophy size={20} strokeWidth={1.6} />
                </span>
                <span className="sidebar-link-label">Campeonatos</span>
              </Link>

              {/* Financeiro */}
              <Link
                to="/trainer/financeiro"
                className={`sidebar-link ${isActive('/trainer/financeiro') ? 'sidebar-link--active' : ''}`}
                aria-label="Financeiro"
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <DollarSign size={20} strokeWidth={1.6} />
                </span>
                <span className="sidebar-link-label">Financeiro</span>
                {financeiroBadgeCount > 0 && (
                  <span className="sidebar-link-badge sidebar-link-badge--count" aria-label={`${financeiroBadgeCount} cobranças pendentes`}>
                    {financeiroBadgeCount > 99 ? '99+' : financeiroBadgeCount}
                  </span>
                )}
              </Link>

              {/* Sua Marca */}
              <Link
                to="/trainer/branding"
                className={`sidebar-link ${isActive('/trainer/branding') ? 'sidebar-link--active' : ''}`}
                aria-label="Sua Marca"
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <Palette size={20} strokeWidth={1.6} />
                </span>
                <span className="sidebar-link-label">Sua Marca</span>
              </Link>

              {/* Biblioteca dropdown */}
              <button
                onClick={() => {
                  if (!sidebarOpen) {
                    setSidebarOpen(true);
                    setBibliotecaOpen(true);
                  } else {
                    setBibliotecaOpen(o => !o);
                  }
                }}
                className={`sidebar-dropdown-toggle ${isBibliotecaActive() ? 'sidebar-link--active' : ''}`}
                aria-label="Biblioteca"
                aria-expanded={bibliotecaOpen}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <BookOpen size={20} strokeWidth={1.6} />
                </span>
                <span className="sidebar-link-label">Biblioteca</span>
                <span className={`sidebar-dropdown-chevron ${bibliotecaOpen ? 'sidebar-dropdown-chevron--open' : ''}`}>
                  <ChevronDown size={14} strokeWidth={1.6} />
                </span>
              </button>

              {bibliotecaOpen && sidebarOpen && (
                <div className="sidebar-dropdown-children">
                  {bibliotecaChildren.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`sidebar-child-link ${isActive(child.path) ? 'sidebar-link--active' : ''}`}
                      aria-label={child.label}
                    >
                      <span className="sidebar-link-icon" aria-hidden="true">
                        <child.Icon size={16} strokeWidth={1.6} />
                      </span>
                      <span className="sidebar-link-label">{child.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {user?.firstName ? `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase() : (user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <div className="sidebar-user-name">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''}</div>
              <div className="sidebar-user-email">{user?.email}</div>
              {user?.platformPlan?.tier && (
                <span className={`${getPlanBadgeClass(user.platformPlan.tier)} sidebar-plan-badge`}>
                  {t(`platformPlan.tier.${user.platformPlan.tier}`) || user.platformPlan.tier}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout" aria-label="Sair da conta">
            <LogOut size={18} strokeWidth={1.6} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className={`main-content${noPadding ? ' main-content--fullscreen' : ''}`}>
        {noPadding ? children : <div className="main-content-inner">{children}</div>}
      </main>

      {/* Bottom Navigation — visible only on mobile */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        <Link
          to="/"
          className={`bottom-nav-item ${isActive('/') ? 'bottom-nav-item--active' : ''}`}
          aria-label="Painel"
        >
          <span className="bottom-nav-item-icon" aria-hidden="true">
            <Home size={22} strokeWidth={1.6} />
          </span>
          <span>Painel</span>
        </Link>

        {isStudentUser && (
          <Link
            to="/my/protocols"
            className={`bottom-nav-item ${isActive('/my/protocols') ? 'bottom-nav-item--active' : ''}`}
            aria-label="Minhas Rotinas"
          >
            <span className="bottom-nav-item-icon" aria-hidden="true">
              <ClipboardList size={22} strokeWidth={1.6} />
            </span>
            <span>Rotinas</span>
          </Link>
        )}

        {isStudentUser && (
          <Link
            to="/my/diet"
            className={`bottom-nav-item ${isActive('/my/diet') ? 'bottom-nav-item--active' : ''}`}
            aria-label="Minha Dieta"
          >
            <span className="bottom-nav-item-icon" aria-hidden="true">
              <Utensils size={22} strokeWidth={1.6} />
            </span>
            <span>Dieta</span>
          </Link>
        )}

        {hasRole('TRAINER') && (
          <Link
            to="/trainer/students"
            className={`bottom-nav-item ${isActive('/trainer/students') ? 'bottom-nav-item--active' : ''}`}
            aria-label="Meus Alunos"
          >
            <span className="bottom-nav-item-icon" aria-hidden="true">
              <Users size={22} strokeWidth={1.6} />
            </span>
            <span>Alunos</span>
          </Link>
        )}

        {hasRole('TRAINER') && showAi && (
          <Link
            to="/trainer/ai-assistant"
            className={`bottom-nav-item ${isActive('/trainer/ai-assistant') ? 'bottom-nav-item--active' : ''}`}
            aria-label="iArnold"
          >
            <span className="bottom-nav-item-icon" aria-hidden="true">
              <Sparkles size={22} strokeWidth={1.6} />
            </span>
            <span>iArnold</span>
          </Link>
        )}

        {hasRole('TRAINER') && (
          <div className="bottom-nav-popover-wrapper" ref={popoverRef}>
            <button
              onClick={() => setBibliotecaPopover(o => !o)}
              className={`bottom-nav-item ${isBibliotecaActive() ? 'bottom-nav-item--active' : ''}`}
              aria-label="Biblioteca"
              aria-haspopup="true"
              aria-expanded={bibliotecaPopover}
            >
              <span className="bottom-nav-item-icon" aria-hidden="true">
                <BookOpen size={22} strokeWidth={1.6} />
              </span>
              <span>Biblioteca</span>
            </button>

            {bibliotecaPopover && (
              <div className="bottom-nav-popover" role="menu">
                {bibliotecaChildren.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={`bottom-nav-popover-item ${isActive(child.path) ? 'bottom-nav-popover-item--active' : ''}`}
                    onClick={() => setBibliotecaPopover(false)}
                    role="menuitem"
                  >
                    <child.Icon size={16} strokeWidth={1.6} />
                    <span>{child.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <Link
          to="/profile"
          className={`bottom-nav-item ${isActive('/profile') ? 'bottom-nav-item--active' : ''}`}
          aria-label="Meu Perfil"
        >
          <span className="bottom-nav-item-icon" aria-hidden="true">
            <User size={22} strokeWidth={1.6} />
          </span>
          <span>Perfil</span>
        </Link>
      </nav>

      {/* AI floating action button — visible when AI is working or has a new response, and user is not on the AI page */}
      {hasRole('TRAINER') && showAi && !isActive('/trainer/ai-assistant') && (aiLoading || aiHasNewResponse) && (
        <button
          className="ai-fab"
          onClick={() => navigate('/trainer/ai-assistant')}
          aria-label={aiHasNewResponse ? 'Assistente IA respondeu' : 'Assistente IA processando'}
        >
          <Sparkles size={20} strokeWidth={1.6} />
          {aiHasNewResponse && <span className="ai-fab__badge" />}
          {aiLoading && <span className="ai-fab__pulse" />}
        </button>
      )}
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  noPadding: PropTypes.bool,
};

export default Layout;
