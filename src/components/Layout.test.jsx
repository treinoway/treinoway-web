import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Layout from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/AiChatContext', () => ({
  useAiChat: vi.fn(),
}));

const mockLogout = vi.fn();
const mockHasRole = vi.fn();

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({
    user: { id: 1, firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
    logout: mockLogout,
    hasRole: mockHasRole.mockReturnValue(false),
  });
  useAiChat.mockReturnValue({
    loading: false,
    hasNewResponse: false,
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STUDENT_EMAIL = 'n.santos1897@gmail.com';

function setupAuth({ email = 'ana@example.com', isTrainer = false, aiActionsPerStudent } = {}) {
  const platformPlan =
    aiActionsPerStudent !== undefined
      ? { limits: { aiActionsPerStudent } }
      : undefined;
  useAuth.mockReturnValue({
    user: { id: 1, firstName: 'Ana', lastName: 'Lima', email, platformPlan },
    logout: mockLogout,
    hasRole: mockHasRole.mockReturnValue(isTrainer),
  });
}

function setupTrainerWithAi({ aiActionsPerStudent = 3 } = {}) {
  useAuth.mockReturnValue({
    user: {
      id: 1,
      firstName: 'Ana',
      lastName: 'Lima',
      email: 'ana@example.com',
      platformPlan: { limits: { aiActionsPerStudent } },
    },
    logout: mockLogout,
    hasRole: mockHasRole.mockReturnValue(true),
  });
}

describe('Layout', () => {
  // ---------------------------------------------------------------------------
  // Sidebar — logo icon always present regardless of state
  // ---------------------------------------------------------------------------

  // Helper: get the sidebar-logo-btn by its class (avoids ambiguity with
  // the toggle-btn which shares the same aria-label in open state).
  function getLogoBtnFromSidebar() {
    return document.querySelector('.sidebar .sidebar-logo-btn');
  }

  it('renders sidebar-logo-icon in open state', () => {
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toHaveClass('sidebar--open');

    const icon = sidebar.querySelector('.sidebar-logo-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.tagName).toBe('IMG');
    expect(icon).toHaveAttribute('alt', 'TeuFit');
    expect(icon).toHaveAttribute('src', '/img/teufit-f-blue.png');
  });

  it('renders same sidebar-logo-icon in collapsed state', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    await user.click(getLogoBtnFromSidebar());

    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toHaveClass('sidebar--collapsed');

    const icon = sidebar.querySelector('.sidebar-logo-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.tagName).toBe('IMG');
    expect(icon).toHaveAttribute('alt', 'TeuFit');
    expect(icon).toHaveAttribute('src', '/img/teufit-f-blue.png');
  });

  // ---------------------------------------------------------------------------
  // Top app bar — logo icon (mobile)
  // ---------------------------------------------------------------------------

  it('renders the top-app-bar logo pointing at the TeuFit blue F icon', () => {
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const logo = document.querySelector('.top-app-bar-logo');
    expect(logo).toBeInTheDocument();
    expect(logo.tagName).toBe('IMG');
    expect(logo).toHaveAttribute('alt', 'TeuFit');
    expect(logo).toHaveAttribute('src', '/img/teufit-f-blue.png');
  });

  // ---------------------------------------------------------------------------
  // Sidebar — logo button aria attributes
  // ---------------------------------------------------------------------------

  it('logo button has aria-label "Recolher menu lateral" and aria-expanded=true when open', () => {
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const logoBtn = getLogoBtnFromSidebar();
    expect(logoBtn).toHaveClass('sidebar-logo-btn');
    expect(logoBtn).toHaveAttribute('aria-label', 'Recolher menu lateral');
    expect(logoBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('logo button has aria-label "Expandir menu lateral" and aria-expanded=false when collapsed', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    await user.click(getLogoBtnFromSidebar());

    const logoBtn = getLogoBtnFromSidebar();
    expect(logoBtn).toHaveAttribute('aria-label', 'Expandir menu lateral');
    expect(logoBtn).toHaveAttribute('aria-expanded', 'false');
  });

  // ---------------------------------------------------------------------------
  // Sidebar — PanelLeft toggle button always in DOM, tabIndex managed
  // ---------------------------------------------------------------------------

  it('PanelLeft toggle button is in the DOM when open with tabIndex 0', () => {
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const panelLeftBtn = document.querySelector('.sidebar .sidebar-toggle-btn');
    expect(panelLeftBtn).toBeInTheDocument();
    expect(panelLeftBtn.getAttribute('tabindex')).not.toBe('-1');
  });

  it('PanelLeft toggle button stays in DOM when collapsed with tabIndex -1', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    await user.click(getLogoBtnFromSidebar());

    const panelLeftBtn = document.querySelector('.sidebar .sidebar-toggle-btn');
    expect(panelLeftBtn).toBeInTheDocument();
    expect(panelLeftBtn.getAttribute('tabindex')).toBe('-1');
  });

  // ---------------------------------------------------------------------------
  // Sidebar — toggling via logo button
  // ---------------------------------------------------------------------------

  it('clicking logo button collapses the sidebar', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    await user.click(getLogoBtnFromSidebar());

    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toHaveClass('sidebar--collapsed');
    expect(sidebar).not.toHaveClass('sidebar--open');
  });

  it('clicking logo button again expands the sidebar', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    await user.click(getLogoBtnFromSidebar()); // collapse
    await user.click(getLogoBtnFromSidebar()); // expand

    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toHaveClass('sidebar--open');
    expect(sidebar).not.toHaveClass('sidebar--collapsed');
  });

  it('sidebar has sidebar--open class initially', () => {
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    expect(document.querySelector('.sidebar')).toHaveClass('sidebar--open');
  });

  it('sidebar gets sidebar--collapsed class after collapsing', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    await user.click(getLogoBtnFromSidebar());

    expect(document.querySelector('.sidebar')).toHaveClass('sidebar--collapsed');
    expect(document.querySelector('.sidebar')).not.toHaveClass('sidebar--open');
  });

  // ---------------------------------------------------------------------------
  // Layout structure
  // ---------------------------------------------------------------------------

  it('renders children inside main-content-inner by default', () => {
    renderWithRouter(
      <Layout>
        <span>Conteudo padrao</span>
      </Layout>
    );

    const inner = document.querySelector('.main-content-inner');
    expect(inner).toBeInTheDocument();
    expect(screen.getByText('Conteudo padrao')).toBeInTheDocument();
  });

  it('renders children directly in main-content when noPadding is true', () => {
    renderWithRouter(
      <Layout noPadding>
        <span>Conteudo sem padding</span>
      </Layout>
    );

    expect(document.querySelector('.main-content-inner')).not.toBeInTheDocument();
    expect(screen.getByText('Conteudo sem padding')).toBeInTheDocument();
  });

  it('renders main-content-inner when noPadding is false', () => {
    renderWithRouter(
      <Layout noPadding={false}>
        <span>Com padding</span>
      </Layout>
    );

    expect(document.querySelector('.main-content-inner')).toBeInTheDocument();
  });

  it('renders user first name in the top app bar', () => {
    renderWithRouter(
      <Layout>
        <span>Filho</span>
      </Layout>
    );

    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // AI Floating Action Button
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // iArnold sidebar link — plan-based gate
  // ---------------------------------------------------------------------------

  it('shows iArnold sidebar link when aiActionsPerStudent > 0 (PLATINUM = 3)', () => {
    setupTrainerWithAi({ aiActionsPerStudent: 3 });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const sidebar = document.querySelector('.sidebar');
    expect(within(sidebar).getByRole('link', { name: 'iArnold' })).toBeInTheDocument();
  });

  it('marks the iArnold sidebar link with the design-system brand badge, not an orange one', () => {
    setupTrainerWithAi({ aiActionsPerStudent: 3 });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const sidebar = document.querySelector('.sidebar');
    const badge = within(within(sidebar).getByRole('link', { name: 'iArnold' })).getByText('IA');
    expect(badge).toHaveClass('badge', 'badge--tag', 'badge--brand');
  });

  it('hides iArnold sidebar link when aiActionsPerStudent === 0 (FREE)', () => {
    setupTrainerWithAi({ aiActionsPerStudent: 0 });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const sidebar = document.querySelector('.sidebar');
    expect(within(sidebar).queryByRole('link', { name: 'iArnold' })).not.toBeInTheDocument();
  });

  it('shows iArnold sidebar link when aiActionsPerStudent === null (DIAMOND = unlimited)', () => {
    setupTrainerWithAi({ aiActionsPerStudent: null });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const sidebar = document.querySelector('.sidebar');
    expect(within(sidebar).getByRole('link', { name: 'iArnold' })).toBeInTheDocument();
  });

  // Fail-open: missing plan data must NOT delete the nav entry. A stale cached
  // user (hydrated from localStorage before platformPlan shipped) would
  // otherwise lose iArnold forever. The backend still enforces with a 403.
  it('shows iArnold sidebar link when platformPlan is undefined (fail-open for trainers)', () => {
    setupAuth({ isTrainer: true });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const sidebar = document.querySelector('.sidebar');
    expect(within(sidebar).getByRole('link', { name: 'iArnold' })).toBeInTheDocument();
  });

  it('shows iArnold sidebar link when platformPlan.limits has no aiActionsPerStudent key', () => {
    useAuth.mockReturnValue({
      user: {
        firstName: 'Ana',
        lastName: 'Lima',
        email: 'ana@example.com',
        platformPlan: { tier: 'PRO', limits: {} },
      },
      logout: mockLogout,
      hasRole: mockHasRole.mockReturnValue(true),
    });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const sidebar = document.querySelector('.sidebar');
    expect(within(sidebar).getByRole('link', { name: 'iArnold' })).toBeInTheDocument();
  });

  it('hides iArnold sidebar link for a non-trainer even when the plan allows AI', () => {
    setupAuth({ isTrainer: false, aiActionsPerStudent: 3 });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    expect(screen.queryByRole('link', { name: 'iArnold' })).not.toBeInTheDocument();
  });

  it('hides the iArnold bottom-nav item when aiActionsPerStudent === 0 (FREE)', () => {
    setupTrainerWithAi({ aiActionsPerStudent: 0 });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const bottomNav = document.querySelector('.bottom-nav');
    expect(within(bottomNav).queryByRole('link', { name: 'iArnold' })).not.toBeInTheDocument();
  });

  it('shows the iArnold bottom-nav item when platformPlan is undefined (fail-open)', () => {
    setupAuth({ isTrainer: true });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const bottomNav = document.querySelector('.bottom-nav');
    expect(within(bottomNav).getByRole('link', { name: 'iArnold' })).toBeInTheDocument();
  });

  it('hides the AI floating button when aiActionsPerStudent === 0 (FREE)', () => {
    setupTrainerWithAi({ aiActionsPerStudent: 0 });
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    expect(screen.queryByRole('button', { name: /assistente ia/i })).not.toBeInTheDocument();
  });

  it('shows the AI floating button when platformPlan is undefined (fail-open)', () => {
    setupAuth({ isTrainer: true });
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    expect(screen.getByRole('button', { name: /assistente ia processando/i })).toBeInTheDocument();
  });

  it('shows floating button when AI is loading for trainers', () => {
    setupTrainerWithAi();
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    expect(screen.getByRole('button', { name: /assistente ia processando/i })).toBeInTheDocument();
  });

  it('shows floating button with badge when hasNewResponse is true for trainers', () => {
    setupTrainerWithAi();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: true });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const fab = screen.getByRole('button', { name: /assistente ia respondeu/i });
    expect(fab).toBeInTheDocument();
    expect(fab.querySelector('.ai-fab__badge')).toBeInTheDocument();
  });

  it('shows pulse indicator when AI is loading', () => {
    setupTrainerWithAi();
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const fab = screen.getByRole('button', { name: /assistente ia processando/i });
    expect(fab.querySelector('.ai-fab__pulse')).toBeInTheDocument();
  });

  it('renders the floating button as a non-submit button with a decorative icon and no accessible-name leakage', () => {
    setupTrainerWithAi();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: true });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const fab = screen.getByRole('button', { name: 'Assistente IA respondeu' });
    expect(fab).toHaveAttribute('type', 'button');
    expect(fab.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
    expect(fab.querySelector('.ai-fab__badge')).toHaveAttribute('aria-hidden', 'true');
  });

  it('hides the loading ring from assistive technology', () => {
    setupTrainerWithAi();
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const fab = screen.getByRole('button', { name: 'Assistente IA processando' });
    expect(fab.querySelector('.ai-fab__pulse')).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not show floating button for non-trainers', () => {
    mockHasRole.mockReturnValue(false);
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: true });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    expect(screen.queryByRole('button', { name: /assistente ia/i })).not.toBeInTheDocument();
  });

  it('does not show floating button when AI is idle', () => {
    setupTrainerWithAi();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    expect(screen.queryByRole('button', { name: /assistente ia/i })).not.toBeInTheDocument();
  });

  it('navigates to /trainer/ai-assistant on FAB click', async () => {
    const user = userEvent.setup();
    setupTrainerWithAi();
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    await user.click(screen.getByRole('button', { name: /assistente ia processando/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/ai-assistant');
  });

  // ---------------------------------------------------------------------------
  // Student-role navigation visibility
  // ---------------------------------------------------------------------------

  describe('student navigation items', () => {
    it('does not inject student sidebar links for the former student email', () => {
      setupAuth({ email: STUDENT_EMAIL });

      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      expect(screen.queryByRole('link', { name: 'Minhas Rotinas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Anamneses' })).not.toBeInTheDocument();
    });

    it('does not inject student sidebar links for a non-student email', () => {
      setupAuth({ email: 'outro@example.com' });

      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      expect(screen.queryByRole('link', { name: 'Minhas Rotinas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Anamneses' })).not.toBeInTheDocument();
    });

    // ---------------------------------------------------------------------------
  // Biblioteca dropdown — sidebar collapsed behaviour
  // ---------------------------------------------------------------------------

  describe('Biblioteca dropdown — sidebar collapse interaction', () => {
    function getLogoBtnFromSidebar() {
      return document.querySelector('.sidebar .sidebar-logo-btn');
    }

    it('clicking Biblioteca when sidebar is collapsed expands the sidebar and opens the dropdown', async () => {
      setupAuth({ isTrainer: true });
      const user = userEvent.setup();
      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      // Collapse the sidebar first
      await user.click(getLogoBtnFromSidebar());
      expect(document.querySelector('.sidebar')).toHaveClass('sidebar--collapsed');

      // Click Biblioteca while collapsed — scoped to sidebar to avoid ambiguity with bottom-nav button
      const sidebar = document.querySelector('.sidebar');
      await user.click(within(sidebar).getByRole('button', { name: 'Biblioteca' }));

      // Sidebar must now be expanded
      expect(document.querySelector('.sidebar')).toHaveClass('sidebar--open');
      expect(document.querySelector('.sidebar')).not.toHaveClass('sidebar--collapsed');

      // Dropdown children must be visible
      expect(within(sidebar).getByRole('link', { name: 'Rotinas' })).toBeInTheDocument();
    });

    it('hides biblioteca subitems when the sidebar is collapsed even if the dropdown was previously opened', async () => {
      setupAuth({ isTrainer: true });
      const user = userEvent.setup();
      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      const sidebar = document.querySelector('.sidebar');

      // Open the Biblioteca dropdown while sidebar is expanded
      const bibliotecaBtn = within(sidebar).getByRole('button', { name: 'Biblioteca' });
      await user.click(bibliotecaBtn);
      expect(within(sidebar).getByRole('link', { name: 'Rotinas' })).toBeInTheDocument();

      // Collapse the sidebar — subitems must disappear
      await user.click(getLogoBtnFromSidebar());
      expect(document.querySelector('.sidebar')).toHaveClass('sidebar--collapsed');
      expect(within(sidebar).queryByRole('link', { name: 'Rotinas' })).not.toBeInTheDocument();
    });

    it('clicking Biblioteca when sidebar is open toggles the dropdown without changing sidebar state', async () => {
      setupAuth({ isTrainer: true });
      const user = userEvent.setup();
      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      // Sidebar starts open
      const sidebar = document.querySelector('.sidebar');
      expect(sidebar).toHaveClass('sidebar--open');

      // Scoped to sidebar to avoid ambiguity with bottom-nav button
      const bibliotecaBtn = within(sidebar).getByRole('button', { name: 'Biblioteca' });

      // First click — opens dropdown
      await user.click(bibliotecaBtn);
      expect(within(sidebar).getByRole('link', { name: 'Rotinas' })).toBeInTheDocument();
      expect(sidebar).toHaveClass('sidebar--open');

      // Second click — closes dropdown
      await user.click(bibliotecaBtn);
      expect(within(sidebar).queryByRole('link', { name: 'Rotinas' })).not.toBeInTheDocument();
      expect(sidebar).toHaveClass('sidebar--open');
    });
  });

  // ---------------------------------------------------------------------------
  // Financeiro sidebar entry (badge = overdue count from the dashboard cache)
  // ---------------------------------------------------------------------------

  describe('Financeiro sidebar link', () => {
    const DASHBOARD_CACHE_KEY = 'treinoway.trainerDashboardData:1';
    const seedDashboardCache = (overdueCount) => {
      localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
        plans: { expiredCount: 0, renewingSoonCount: 0 },
        routines: { expiredCount: 0, expiringSoonCount: 0 },
        finance: { monthReceived: '0.00', totalReceived: '0.00', overdueCount, overdueAmount: '10.00' },
        engagement: { inactiveStudentsCount: 0, adherenceMonthPct: '0', adherenceDeltaPp: null, weekPrCount: 0 },
        generatedAt: new Date().toISOString(),
      }));
    };

    afterEach(() => localStorage.removeItem(DASHBOARD_CACHE_KEY));

    it('renders Financeiro between iArnold and Biblioteca, linking to /trainer/financeiro', () => {
      setupTrainerWithAi();
      renderWithRouter(<Layout><span>Content</span></Layout>);
      const sidebar = screen.getByRole('complementary');

      const link = within(sidebar).getByRole('link', { name: 'Financeiro' });
      expect(link).toHaveAttribute('href', '/trainer/financeiro');
      const iArnold = within(sidebar).getByRole('link', { name: 'iArnold' });
      const biblioteca = within(sidebar).getByRole('button', { name: 'Biblioteca' });
      expect(iArnold.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(link.compareDocumentPosition(biblioteca) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not render it for non-trainers', () => {
      setupAuth({ isTrainer: false });
      renderWithRouter(<Layout><span>Content</span></Layout>);
      expect(screen.queryByRole('link', { name: /^Financeiro/ })).not.toBeInTheDocument();
    });

    it('is active on /trainer/financeiro but not on the student history page', () => {
      setupAuth({ isTrainer: true });
      const { unmount } = renderWithRouter(<Layout><span>Content</span></Layout>, { route: '/trainer/financeiro' });
      expect(screen.getByRole('link', { name: 'Financeiro' })).toHaveClass('sidebar-link--active');
      unmount();
      renderWithRouter(<Layout><span>Content</span></Layout>, { route: '/trainer/students/s1/subscription-history' });
      expect(screen.getByRole('link', { name: 'Financeiro' })).not.toHaveClass('sidebar-link--active');
    });

    it('hides the badge when nothing is overdue', () => {
      seedDashboardCache(0);
      setupAuth({ isTrainer: true });
      renderWithRouter(<Layout><span>Content</span></Layout>);
      expect(screen.getByRole('link', { name: 'Financeiro' })).toBeInTheDocument();
    });

    it('shows the overdue count in the badge and in the accessible name', () => {
      seedDashboardCache(3);
      setupAuth({ isTrainer: true });
      renderWithRouter(<Layout><span>Content</span></Layout>);
      const link = screen.getByRole('link', { name: 'Financeiro, 3 cobranças em atraso' });
      expect(within(link).getByText('3')).toHaveAttribute('aria-hidden', 'true');
    });

    it('uses singular for one overdue charge and caps at 99+', () => {
      seedDashboardCache(1);
      setupAuth({ isTrainer: true });
      const { unmount } = renderWithRouter(<Layout><span>Content</span></Layout>);
      expect(screen.getByRole('link', { name: 'Financeiro, 1 cobrança em atraso' })).toBeInTheDocument();
      unmount();

      seedDashboardCache(150);
      renderWithRouter(<Layout><span>Content</span></Layout>);
      expect(within(screen.getByRole('link', { name: 'Financeiro, 150 cobranças em atraso' })).getByText('99+')).toBeInTheDocument();
    });

    it('updates live from the Financeiro broadcast without any request', () => {
      setupAuth({ isTrainer: true });
      renderWithRouter(<Layout><span>Content</span></Layout>);
      expect(screen.getByRole('link', { name: 'Financeiro' })).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new CustomEvent('treinoway:finance-overdue-changed', { detail: { overdueCount: 2, overdueAmount: '20.00' } }));
      });
      expect(screen.getByRole('link', { name: 'Financeiro, 2 cobranças em atraso' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Hidden navigation items — features not yet available to users
  // (Sua Marca). The Nutricionista section is live: see 'nutritionist section'; Campeonatos is live since CAMP-48.
  // ---------------------------------------------------------------------------

  describe('hidden navigation items', () => {
    it('does not render Sua Marca in the sidebar for trainers, and renders Campeonatos (CAMP-48)', () => {
      setupAuth({ isTrainer: true });
      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.getByRole('link', { name: 'Campeonatos' })).toHaveAttribute('href', '/trainer/challenges');
      expect(screen.queryByText('Sua Marca')).not.toBeInTheDocument();
    });

    it('never renders the mode switcher, even for dual-role users', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
        logout: mockLogout,
        hasRole: (role) => role === 'TRAINER' || role === 'NUTRITIONIST',
      });
      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.queryByRole('group', { name: 'Alternar modo' })).not.toBeInTheDocument();
      expect(screen.queryByText('Protocolos')).not.toBeInTheDocument();
    });

    it('still renders the Treinador section for dual-role users now that the mode switcher is gone', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
        logout: mockLogout,
        hasRole: (role) => role === 'TRAINER' || role === 'NUTRITIONIST',
      });
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      expect(within(sidebar).getByText('Treinador')).toBeInTheDocument();
      expect(within(sidebar).getByRole('link', { name: 'Meus Alunos' })).toBeInTheDocument();
    });
  });

  describe('nutritionist section (criterion: sidebar Nutricionista › Meus Pacientes)', () => {
    const setupRoles = (roles) => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
        logout: mockLogout,
        hasRole: (role) => roles.includes(role),
      });
    };

    it('shows the Nutricionista section with a Meus Pacientes link for a nutritionist', () => {
      setupRoles(['NUTRITIONIST']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      expect(within(sidebar).getByText('Nutricionista')).toBeInTheDocument();
      expect(within(sidebar).getByRole('link', { name: 'Meus Pacientes' })).toHaveAttribute('href', '/nutritionist/patients');
    });

    it('lists Meus alimentos under Nutricionista, linking to /nutritionist/foods', () => {
      setupRoles(['NUTRITIONIST']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      expect(within(sidebar).getByRole('link', { name: 'Meus alimentos' })).toHaveAttribute('href', '/nutritionist/foods');
    });

    it('shows both Treinador and Nutricionista sections for a dual-role user, Treinador first, with no switcher', () => {
      setupRoles(['TRAINER', 'NUTRITIONIST']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      const trainer = within(sidebar).getByText('Treinador');
      const nutritionist = within(sidebar).getByText('Nutricionista');
      expect(trainer.compareDocumentPosition(nutritionist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(sidebar).getByRole('link', { name: 'Meus Alunos' })).toBeInTheDocument();
      expect(within(sidebar).getByRole('link', { name: 'Meus Pacientes' })).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Alternar modo' })).not.toBeInTheDocument();
    });

    it('does not show the Treinador section to a nutritionist-only user', () => {
      setupRoles(['NUTRITIONIST']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      expect(within(sidebar).queryByText('Treinador')).not.toBeInTheDocument();
      expect(within(sidebar).queryByRole('link', { name: 'Meus Alunos' })).not.toBeInTheDocument();
    });

    it('hides the section for a trainer without the nutritionist role', () => {
      setupRoles(['TRAINER']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      expect(within(sidebar).queryByText('Nutricionista')).not.toBeInTheDocument();
      expect(within(sidebar).queryByRole('link', { name: 'Meus Pacientes' })).not.toBeInTheDocument();
    });

    it('marks Meus Pacientes active on any nested patient route', () => {
      setupRoles(['NUTRITIONIST']);
      renderWithRouter(<Layout><span>Content</span></Layout>, { route: '/nutritionist/patients/p1/plan/menu' });

      const sidebar = document.querySelector('.sidebar');
      expect(within(sidebar).getByRole('link', { name: 'Meus Pacientes' })).toHaveClass('sidebar-link--active');
    });
  });

  describe('admin section', () => {
    const setupRoles = (roles) => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
        logout: mockLogout,
        hasRole: (role) => roles.includes(role),
      });
    };

    it('shows the Administração section with its four links for admins', () => {
      setupRoles(['ADMIN']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      expect(within(sidebar).getByText('Administração')).toBeInTheDocument();
      expect(within(sidebar).getByRole('link', { name: 'Convites do beta' })).toHaveAttribute('href', '/admin/invites');
      expect(within(sidebar).getByRole('link', { name: 'Trainers e planos' })).toHaveAttribute('href', '/admin/trainers');
      expect(within(sidebar).getByRole('link', { name: 'Uso do iArnold' })).toHaveAttribute('href', '/admin/ai-usage');
      expect(within(sidebar).getByRole('link', { name: 'Tutoriais' })).toHaveAttribute('href', '/admin/tutorials');
    });

    it('renders Administração before Treinador for an admin trainer', () => {
      setupRoles(['ADMIN', 'TRAINER']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      const admin = within(sidebar).getByText('Administração');
      const trainer = within(sidebar).getByText('Treinador');
      expect(admin.compareDocumentPosition(trainer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('hides the Administração section for non-admins', () => {
      setupRoles(['TRAINER']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.queryByText('Administração')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Convites do beta' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Tutoriais' })).not.toBeInTheDocument();
    });
  });

  describe('Como usar (trainer tutorials)', () => {
    const setupRoles = (roles) => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
        logout: mockLogout,
        hasRole: (role) => roles.includes(role),
      });
    };

    it('shows a Como usar link to /trainer/tutorials in the sidebar for trainers', () => {
      setupRoles(['TRAINER']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const sidebar = document.querySelector('.sidebar');
      expect(within(sidebar).getByRole('link', { name: 'Como usar' })).toHaveAttribute('href', '/trainer/tutorials');
    });

    it('does not show Como usar in the sidebar for non-trainers', () => {
      setupRoles(['ADMIN']);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.queryByRole('link', { name: 'Como usar' })).not.toBeInTheDocument();
    });

    it('turns the mobile Perfil item into a menu with Meu Perfil and Como usar for trainers', async () => {
      setupRoles(['TRAINER']);
      const user = userEvent.setup();
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const bottomNav = document.querySelector('.bottom-nav');
      expect(within(bottomNav).queryByRole('menuitem', { name: 'Como usar' })).not.toBeInTheDocument();

      await user.click(within(bottomNav).getByRole('button', { name: 'Perfil' }));

      expect(within(bottomNav).getByRole('menuitem', { name: 'Meu Perfil' })).toHaveAttribute('href', '/profile');
      expect(within(bottomNav).getByRole('menuitem', { name: 'Como usar' })).toHaveAttribute('href', '/trainer/tutorials');
    });

    it('closes the mobile Perfil menu after choosing Como usar', async () => {
      setupRoles(['TRAINER']);
      const user = userEvent.setup();
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const bottomNav = document.querySelector('.bottom-nav');
      await user.click(within(bottomNav).getByRole('button', { name: 'Perfil' }));
      await user.click(within(bottomNav).getByRole('menuitem', { name: 'Como usar' }));

      expect(within(bottomNav).queryByRole('menuitem', { name: 'Como usar' })).not.toBeInTheDocument();
    });

    it('keeps the mobile Perfil item a plain link to /profile for non-trainers', () => {
      setupRoles([]);
      renderWithRouter(<Layout><span>Content</span></Layout>);

      const bottomNav = document.querySelector('.bottom-nav');
      expect(within(bottomNav).getByRole('link', { name: 'Meu Perfil' })).toHaveAttribute('href', '/profile');
      expect(within(bottomNav).queryByRole('button', { name: 'Perfil' })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Platform plan badge
  // ---------------------------------------------------------------------------

  describe('platform plan badge', () => {
    it('shows "Grátis" badge for FREE tier', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', platformPlan: { tier: 'FREE', status: 'ACTIVE' } },
        logout: mockLogout,
        hasRole: mockHasRole.mockReturnValue(false),
      });

      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.getByText('Grátis')).toBeInTheDocument();
    });

    it('shows "Pro" badge for PRO tier', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', platformPlan: { tier: 'PRO', status: 'ACTIVE' } },
        logout: mockLogout,
        hasRole: mockHasRole.mockReturnValue(false),
      });

      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('shows "Platinum" badge for PLATINUM tier', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', platformPlan: { tier: 'PLATINUM', status: 'ACTIVE' } },
        logout: mockLogout,
        hasRole: mockHasRole.mockReturnValue(false),
      });

      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.getByText('Platinum')).toBeInTheDocument();
    });

    it('shows "Diamond" badge for DIAMOND tier', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', platformPlan: { tier: 'DIAMOND', status: 'ACTIVE' } },
        logout: mockLogout,
        hasRole: mockHasRole.mockReturnValue(false),
      });

      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.getByText('Diamond')).toBeInTheDocument();
    });

    it('renders no plan badge when platformPlan is undefined (student user)', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
        logout: mockLogout,
        hasRole: mockHasRole.mockReturnValue(false),
      });

      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.queryByText('Grátis')).not.toBeInTheDocument();
      expect(screen.queryByText('Pro')).not.toBeInTheDocument();
      expect(screen.queryByText('Platinum')).not.toBeInTheDocument();
      expect(screen.queryByText('Diamond')).not.toBeInTheDocument();
    });

    it('renders no plan badge when platformPlan.tier is missing', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', platformPlan: { status: 'ACTIVE' } },
        logout: mockLogout,
        hasRole: mockHasRole.mockReturnValue(false),
      });

      renderWithRouter(<Layout><span>Content</span></Layout>);

      expect(screen.queryByText('Grátis')).not.toBeInTheDocument();
    });
  });

  it('hides student items even when the user has no email set', () => {
      useAuth.mockReturnValue({
        user: { firstName: 'Sem', lastName: 'Email' },
        logout: mockLogout,
        hasRole: mockHasRole.mockReturnValue(false),
      });

      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      expect(screen.queryByRole('link', { name: 'Minhas Rotinas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Anamneses' })).not.toBeInTheDocument();
    });
  });
});
