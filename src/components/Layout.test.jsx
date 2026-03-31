import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
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

describe('Layout', () => {
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

    const inner = document.querySelector('.main-content-inner');
    expect(inner).not.toBeInTheDocument();
    expect(screen.getByText('Conteudo sem padding')).toBeInTheDocument();
  });

  it('renders main-content-inner when noPadding is false', () => {
    renderWithRouter(
      <Layout noPadding={false}>
        <span>Com padding</span>
      </Layout>
    );

    const inner = document.querySelector('.main-content-inner');
    expect(inner).toBeInTheDocument();
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
});
