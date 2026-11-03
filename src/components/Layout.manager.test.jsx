import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
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

// Mocks an authenticated user holding the given roles.
const setupRoles = (roles) => {
  useAuth.mockReturnValue({
    user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
    logout: vi.fn(),
    hasRole: (role) => roles.includes(role),
  });
};

describe('Layout Administração: Manager link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
  });

  it('shows a Manager link to /manager in the Administração section for admins', () => {
    setupRoles(['ADMIN']);

    renderWithRouter(<Layout><span>Content</span></Layout>);

    const sidebar = document.querySelector('.sidebar');
    expect(within(sidebar).getByText('Administração')).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: 'Manager' })).toHaveAttribute('href', '/manager');
  });

  it('hides the Manager link from non-admins', () => {
    setupRoles(['TRAINER']);

    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(screen.queryByRole('link', { name: 'Manager' })).not.toBeInTheDocument();
  });
});
