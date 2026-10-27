import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Layout from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));

// Test helper: setupTrainer.
const setupTrainer = () => {
  useAuth.mockReturnValue({
    user: { id: 1, firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
    logout: vi.fn(),
    hasRole: vi.fn().mockReturnValue(true),
  });
  useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
};

describe('Layout — Técnicas avançadas library entry (criterion 9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTrainer();
  });

  it('lists "Técnicas avançadas" in the Biblioteca menu linking to /trainer/advanced-techniques', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Layout><span>Content</span></Layout>);

    const sidebar = document.querySelector('.sidebar');
    await user.click(within(sidebar).getByRole('button', { name: 'Biblioteca' }));

    const link = within(sidebar).getByRole('link', { name: 'Técnicas avançadas' });
    expect(link).toHaveAttribute('href', '/trainer/advanced-techniques');
  });
});
