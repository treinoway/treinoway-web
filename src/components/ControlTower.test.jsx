import userEvent from '@testing-library/user-event';
import { screen } from '../test/test-utils';
import { renderWithRouter } from '../test/test-utils';
import ControlTower from './ControlTower';

const buildData = (overrides = {}) => ({
  plans: { expiredCount: 3, renewingSoonCount: 2 },
  routines: { expiredCount: 4, expiringSoonCount: 2 },
  finance: { monthReceived: '2500.00', totalReceived: '12000.00', overdueCount: 3, overdueAmount: '450.00' },
  engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: '3.20', weekPrCount: 4 },
  generatedAt: new Date().toISOString(),
  ...overrides,
});

describe('ControlTower', () => {
  it('always shows the "Tua semana em foco" heading', () => {
    renderWithRouter(<ControlTower data={null} loading error={false} onRetry={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Tua semana em foco' })).toBeInTheDocument();
  });

  describe('Cold-start skeleton', () => {
    it('shows skeleton rows and hides the timestamp on a true cache miss', () => {
      const { container } = renderWithRouter(<ControlTower data={null} loading error={false} onRetry={vi.fn()} />);
      expect(container.querySelectorAll('.control-tile-skeleton')).toHaveLength(10);
      expect(screen.queryByText(/^atualizado/)).not.toBeInTheDocument();
    });
  });

  describe('Retry (fetch failed, no cache)', () => {
    it('shows a discreet "Atualizar" text button, never a toast or red banner', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      renderWithRouter(<ControlTower data={null} loading={false} error="Erro de conexão" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: 'Atualizar' });
      await user.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows the actual error message text next to the retry button', () => {
      renderWithRouter(<ControlTower data={null} loading={false} error="Sem conexão com o servidor. Verifique sua internet e tente novamente." onRetry={vi.fn()} />);

      expect(screen.getByText('Sem conexão com o servidor. Verifique sua internet e tente novamente.')).toBeInTheDocument();
    });

    it('falls back to a generic message when error is true without a message string', () => {
      renderWithRouter(<ControlTower data={null} loading={false} error onRetry={vi.fn()} />);

      expect(screen.getByText('Não foi possível atualizar.')).toBeInTheDocument();
    });
  });

  describe('Data present', () => {
    it('shows the "atualizado" timestamp once data resolves', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);
      expect(screen.getByText(/^atualizado/)).toBeInTheDocument();
    });
  });

  describe('Radar band', () => {
    it('collapses to the calm strip when all four counts are zero ("tudo em dia")', () => {
      const data = buildData({
        plans: { expiredCount: 0, renewingSoonCount: 0 },
        routines: { expiredCount: 0, expiringSoonCount: 0 },
      });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('Nada exige ação agora')).toBeInTheDocument();
      expect(screen.queryByText('Planos expirados')).not.toBeInTheDocument();
    });

    it('renders all four tiles with the correct deep-links when there are pendências', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('Planos expirados')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '3 planos expirados, ver detalhes' }))
        .toHaveAttribute('href', '/trainer/students?status=vencido');
      expect(screen.getByRole('link', { name: '2 planos com renovação em até 7 dias, ver detalhes' }))
        .toHaveAttribute('href', '/trainer/students?status=pendente');
    });

    it('never links "Rotinas vencidas" or "Rotinas vencendo" — no valid routine-status filter route exists', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('Rotinas vencidas')).toBeInTheDocument();
      expect(screen.getByText('Rotinas vencendo em até 7 dias')).toBeInTheDocument();
      // Only the two Radar tiles backed by a real Students filter are links.
      expect(screen.queryByRole('link', { name: /rotinas/i })).not.toBeInTheDocument();
    });

    it('omits "Planos expirados" and "Renovação" tiles entirely when their counts are zero, keeping only the nonzero routine tiles', () => {
      const data = buildData({ plans: { expiredCount: 0, renewingSoonCount: 0 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.queryByText('Planos expirados')).not.toBeInTheDocument();
      expect(screen.queryByText('Renovação em até 7 dias')).not.toBeInTheDocument();
      // Routines counts are still nonzero in this fixture, so those tiles remain.
      expect(screen.getByText('Rotinas vencidas')).toBeInTheDocument();
      expect(screen.getByText('Rotinas vencendo em até 7 dias')).toBeInTheDocument();
    });

    it('omits a single metric tile when only that one count is zero', () => {
      const data = buildData({ routines: { expiredCount: 0, expiringSoonCount: 2 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.queryByText('Rotinas vencidas')).not.toBeInTheDocument();
      expect(screen.getByText('Rotinas vencendo em até 7 dias')).toBeInTheDocument();
    });
  });

  describe('Financeiro band', () => {
    it('formats Recebido no mês and Acumulado total as pt-BR currency; only Recebido links', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText(/R\$\s?2\.500,00/)).toBeInTheDocument();
      expect(screen.getByText(/R\$\s?12\.000,00/)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /acumulado/i })).not.toBeInTheDocument();
    });

    it('always links "Recebido no mês" to /trainer/financeiro (the mobile entry point)', () => {
      const data = buildData({ finance: { monthReceived: '2500.00', totalReceived: '12000.00', overdueCount: 0, overdueAmount: '0.00' } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByRole('link', { name: /Recebido no mês: R\$\s?2\.500,00\. Abrir Financeiro/ }))
        .toHaveAttribute('href', '/trainer/financeiro');
    });

    it('keeps "Recebido no mês" linked even when the cache is stale', () => {
      const staleGeneratedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      renderWithRouter(<ControlTower data={buildData({ generatedAt: staleGeneratedAt })} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByRole('link', { name: /Recebido no mês/ })).toHaveAttribute('href', '/trainer/financeiro');
    });

    it('links "Pagamentos em atraso" to the overdue filter when overdueCount > 0 and data is fresh', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByRole('link', { name: '3 pagamentos em atraso, ver detalhes' }))
        .toHaveAttribute('href', '/trainer/financeiro?status=overdue');
      expect(screen.getByText(/R\$\s?450,00 em atraso/)).toBeInTheDocument();
    });

    it('omits the "Pagamentos em atraso" tile entirely when overdueCount is zero', () => {
      const data = buildData({ finance: { monthReceived: '2500.00', totalReceived: '12000.00', overdueCount: 0, overdueAmount: '0.00' } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.queryByText('Pagamentos em atraso')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /pagamentos em atraso/i })).not.toBeInTheDocument();
    });

    it('dims values, suppresses the overdue link and offers a "toque para atualizar" retry when the cache is stale', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      const staleGeneratedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20min > 15min threshold
      const data = buildData({ generatedAt: staleGeneratedAt });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={onRetry} />);

      expect(screen.queryByRole('link', { name: /pagamentos em atraso/i })).not.toBeInTheDocument();
      const retryTile = screen.getByRole('button', { name: '3 pagamentos em atraso, ver detalhes' });
      expect(screen.getByText('Toque para atualizar')).toBeInTheDocument();

      await user.click(retryTile);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pulso band', () => {
    it('links "Alunos inativos 7d+" to /trainer/students when the count is greater than zero', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByRole('link', { name: '5 alunos inativos há 7 dias ou mais, ver detalhes' }))
        .toHaveAttribute('href', '/trainer/students');
    });

    it('still shows the "Alunos inativos 7d+" tile (unlinked) when the count is zero — unlike Radar/Financeiro, this one stays visible at zero', () => {
      const data = buildData({ engagement: { inactiveStudentsCount: 0, adherenceMonthPct: '78.50', adherenceDeltaPp: '3.20', weekPrCount: 4 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('Alunos inativos 7d+')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /alunos inativos/i })).not.toBeInTheDocument();
    });

    it('shows Adesão do mês formatted with a pt-BR comma decimal and a green "+X pp" delta', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('78,5')).toBeInTheDocument();
      expect(screen.getByText('+3,2 pp')).toBeInTheDocument();
    });

    it('shows a "−X pp" delta for a negative string adherenceDeltaPp', () => {
      const data = buildData({ engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: '-3.20', weekPrCount: 4 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('−3,2 pp')).toBeInTheDocument();
    });

    it('shows a "+X pp" delta for a positive string adherenceDeltaPp', () => {
      const data = buildData({ engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: '3.20', weekPrCount: 4 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('+3,2 pp')).toBeInTheDocument();
    });

    it('shows a neutral "0 pp" when adherenceDeltaPp is exactly 0', () => {
      const data = buildData({ engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: 0, weekPrCount: 4 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('0 pp')).toBeInTheDocument();
    });

    it('shows a neutral "0 pp" when adherenceDeltaPp is the string "0.00"', () => {
      const data = buildData({ engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: '0.00', weekPrCount: 4 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('0 pp')).toBeInTheDocument();
    });

    it('renders no delta at all when adherenceDeltaPp is null', () => {
      const data = buildData({ engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: null, weekPrCount: 4 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.queryByText(/pp$/)).not.toBeInTheDocument();
    });

    it('shows the PR celebration count pluralized when weekPrCount > 1', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);
      expect(screen.getByText('4 PRs')).toBeInTheDocument();
    });

    it('shows singular "1 PR" when weekPrCount is exactly 1', () => {
      const data = buildData({ engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: '3.20', weekPrCount: 1 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);
      expect(screen.getByText('1 PR')).toBeInTheDocument();
    });

    it('shows a discreet no-PR message when weekPrCount is zero', () => {
      const data = buildData({ engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: '3.20', weekPrCount: 0 } });
      renderWithRouter(<ControlTower data={data} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.getByText('Nenhum PR essa semana')).toBeInTheDocument();
      expect(screen.queryByText(/^\d+ PRs?$/)).not.toBeInTheDocument();
    });

    it('never links Adesão do mês or PRs da semana — no low-adherence or PR detail route exists', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.queryByRole('link', { name: /adesão/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /PR/i })).not.toBeInTheDocument();
    });
  });

  describe('New-trainer state (rosterEmpty)', () => {
    it('replaces the tiles with a welcome message and a CTA to link the first student', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} rosterEmpty onRetry={vi.fn()} />);

      expect(screen.getByRole('heading', { name: 'Tua semana em foco' })).toBeInTheDocument();
      expect(screen.getByText('Seu painel ganha vida com o primeiro aluno')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Convidar primeiro aluno' })).toHaveAttribute('href', '/trainer/students');
      expect(screen.queryByText('Planos expirados')).not.toBeInTheDocument();
    });

    it('does not show the welcome state when the roster is not known to be empty', () => {
      renderWithRouter(<ControlTower data={buildData()} loading={false} error={false} onRetry={vi.fn()} />);

      expect(screen.queryByText('Seu painel ganha vida com o primeiro aluno')).not.toBeInTheDocument();
      expect(screen.getByText('Planos expirados')).toBeInTheDocument();
    });
  });
});
