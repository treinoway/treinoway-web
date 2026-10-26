import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
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

beforeEach(() => {
  vi.clearAllMocks();
  useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
});

// Mocks an authenticated trainer with the given platform plan tier.
const setupTrainerWithTier = (tier) => {
  useAuth.mockReturnValue({
    user: {
      firstName: 'Ana',
      lastName: 'Lima',
      email: 'ana@example.com',
      platformPlan: { tier, status: 'ACTIVE' },
    },
    logout: vi.fn(),
    hasRole: vi.fn().mockReturnValue(true),
  });
};

describe('Layout platform plan badge - BETA tier', () => {
  it('shows a "Beta" badge for the BETA tier', () => {
    setupTrainerWithTier('BETA');

    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('gives the BETA badge the same class as DIAMOND', () => {
    setupTrainerWithTier('BETA');

    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(screen.getByText('Beta')).toHaveClass('badge', 'badge-accent', 'sidebar-plan-badge');
  });
});
