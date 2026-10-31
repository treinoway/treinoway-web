import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Layout from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));

// Mocks a signed-in user; trainers get the trainer bottom nav.
const setupUser = ({ isTrainer }) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
    logout: vi.fn(),
    hasRole: vi.fn().mockReturnValue(isTrainer),
  });
};

// Returns the mobile bottom navigation.
const getBottomNav = () => screen.getByRole('navigation', { name: 'Navegação principal' });

describe('Layout bottom nav: Perfil menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAiChat).mockReturnValue({ loading: false, hasNewResponse: false });
  });

  it('offers Financeiro in the trainer Perfil menu, linking to the finance page', async () => {
    const user = userEvent.setup();
    setupUser({ isTrainer: true });
    renderWithRouter(<Layout><span>Content</span></Layout>);

    await user.click(within(getBottomNav()).getByRole('button', { name: 'Perfil' }));

    const menu = within(getBottomNav()).getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /financeiro/i })).toHaveAttribute('href', '/trainer/financeiro');
  });

  it('keeps Meu Perfil and Como usar in that menu', async () => {
    const user = userEvent.setup();
    setupUser({ isTrainer: true });
    renderWithRouter(<Layout><span>Content</span></Layout>);

    await user.click(within(getBottomNav()).getByRole('button', { name: 'Perfil' }));

    const menu = within(getBottomNav()).getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Meu Perfil' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /como usar/i })).toBeInTheDocument();
  });

  it('does not add a top-level Financeiro item to the bottom nav', () => {
    setupUser({ isTrainer: true });
    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(within(getBottomNav()).queryByRole('link', { name: /financeiro/i })).not.toBeInTheDocument();
  });

  it('does not show Financeiro to a non-trainer', () => {
    setupUser({ isTrainer: false });
    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(within(getBottomNav()).queryByText(/financeiro/i)).not.toBeInTheDocument();
  });
});
