import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import Students from './Students';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), getPlatform: vi.fn() }));

vi.mock('../../platform', () => platform);
vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../../hooks/useOnboardingStatus', () => ({ markOnboardingStepOptimistic: vi.fn() }));

const UPGRADE_TEXT = /upgrade|assine|assinatura|pre[çc]o|checkout|pagar/i;

const BLOCKED_STUDENT = {
  id: 'r4',
  firstName: 'Camila',
  lastName: 'Nunes',
  email: 'camila@example.com',
  billingStatus: 'ok',
  ready: false,
  blockers: ['blocked_on_plan'],
  blockersLabel: ['Bloqueado pela sua cota'],
};

const showToast = vi.fn();

// Serves the students list with one student blocked by the platform quota.
const mockBlockedStudent = () => {
  api.get.mockImplementation((url) => (
    url === '/trainer/students' ? Promise.resolve({ data: [BLOCKED_STUDENT] }) : Promise.resolve({ data: [] })
  ));
};

describe('Students: platform quota in the native app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.post.mockReset();
    mockBlockedStudent();
  });

  it('keeps telling the trainer that a student is blocked, without any upgrade call', async () => {
    platform.isNative.mockReturnValue(true);
    renderWithRouter(<Students />);

    await screen.findByRole('button', { name: 'Camila Nunes — Bloqueado pela sua cota. Ver perfil.' });

    const quotaBanner = screen.getAllByRole('status').find((region) => /limite de alunos/i.test(region.textContent));
    expect(quotaBanner).toBeDefined();
    expect(quotaBanner).toHaveTextContent(/1 aluno.*bloquead/i);
    expect(screen.queryByText(UPGRADE_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: UPGRADE_TEXT })).not.toBeInTheDocument();
  });

  it('does not offer any way to reach plans or checkout from the banner', async () => {
    platform.isNative.mockReturnValue(true);
    renderWithRouter(<Students />);

    await screen.findByRole('button', { name: 'Camila Nunes — Bloqueado pela sua cota. Ver perfil.' });

    expect(screen.queryByRole('button', { name: /fazer upgrade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: UPGRADE_TEXT })).not.toBeInTheDocument();
  });

  it('shows a neutral toast when linking is refused by the plan, even if the server asks for an upgrade', async () => {
    const user = userEvent.setup();
    platform.isNative.mockReturnValue(true);
    const error = new Error('Forbidden');
    error.response = {
      status: 403,
      data: {
        error: 'STUDENT_CAP_EXCEEDED',
        messageCode: 'platformPlan.studentCapExceeded',
        message: 'Faça upgrade para o plano Pro por R$ 99,90.',
      },
    };
    api.post.mockRejectedValue(error);
    renderWithRouter(<Students />);
    await screen.findByRole('button', { name: 'Camila Nunes — Bloqueado pela sua cota. Ver perfil.' });

    await user.click(screen.getAllByRole('button', { name: /vincular aluno/i })[0]);
    await user.type(await screen.findByLabelText(/e-mail/i), 'cap@example.com');
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/\S/), 'error'));
    const [message] = showToast.mock.calls.find(([, tone]) => tone === 'error');
    expect(message).not.toMatch(UPGRADE_TEXT);
  });
});

describe('Students: platform quota on the website', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    platform.isNative.mockReturnValue(false);
    mockBlockedStudent();
  });

  it('still shows the upgrade banner with its call to action', async () => {
    renderWithRouter(<Students />);

    await screen.findByRole('button', { name: 'Camila Nunes — Bloqueado pela sua cota. Ver perfil.' });

    expect(screen.getByText('Você atingiu o limite de alunos da sua cota')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fazer upgrade' })).toBeInTheDocument();
  });
});
