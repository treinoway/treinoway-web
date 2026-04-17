import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
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
    user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
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

function setupAuth({ email = 'ana@example.com', isTrainer = false } = {}) {
  useAuth.mockReturnValue({
    user: { firstName: 'Ana', lastName: 'Lima', email },
    logout: mockLogout,
    hasRole: mockHasRole.mockReturnValue(isTrainer),
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
    expect(icon).toHaveAttribute('alt', 'Treinoway');
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
    expect(icon).toHaveAttribute('alt', 'Treinoway');
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

  it('shows floating button when AI is loading for trainers', () => {
    mockHasRole.mockReturnValue(true);
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    expect(screen.getByRole('button', { name: /assistente ia processando/i })).toBeInTheDocument();
  });

  it('shows floating button with badge when hasNewResponse is true for trainers', () => {
    mockHasRole.mockReturnValue(true);
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
    mockHasRole.mockReturnValue(true);
    useAiChat.mockReturnValue({ loading: true, hasNewResponse: false });

    renderWithRouter(
      <Layout>
        <span>Content</span>
      </Layout>
    );

    const fab = screen.getByRole('button', { name: /assistente ia processando/i });
    expect(fab.querySelector('.ai-fab__pulse')).toBeInTheDocument();
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
    mockHasRole.mockReturnValue(true);
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
    mockHasRole.mockReturnValue(true);
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
    it('shows "Minhas Rotinas" and "Anamneses" in sidebar for the student email', () => {
      setupAuth({ email: STUDENT_EMAIL });

      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      const rotinasLinks = screen.getAllByRole('link', { name: 'Minhas Rotinas' });
      expect(rotinasLinks.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('link', { name: 'Anamneses' })).toBeInTheDocument();
    });

    it('shows "Rotinas" bottom nav link for the student email', () => {
      setupAuth({ email: STUDENT_EMAIL });

      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      const rotinasLinks = screen.getAllByRole('link', { name: 'Minhas Rotinas' });
      expect(rotinasLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('hides "Minhas Rotinas" and "Anamneses" from sidebar for a non-student email', () => {
      setupAuth({ email: 'outro@example.com' });

      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      expect(screen.queryByRole('link', { name: 'Minhas Rotinas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Anamneses' })).not.toBeInTheDocument();
    });

    it('hides "Rotinas" bottom nav link for a non-student email', () => {
      setupAuth({ email: 'outro@example.com' });

      renderWithRouter(
        <Layout>
          <span>Content</span>
        </Layout>
      );

      expect(screen.queryByRole('link', { name: 'Minhas Rotinas' })).not.toBeInTheDocument();
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
