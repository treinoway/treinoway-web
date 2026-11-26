import { screen, waitFor, within, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Overview from './Overview';
import api from '../../api/axios';
import { buildOverview, buildZeroOverview, WEEK_LABELS } from '../../test/managerOverviewFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const OVERVIEW_URL = '/admin/manager/overview';

// Answers the overview request with `payload`.
const mockOverview = (payload) => {
  api.get.mockImplementation((url) =>
    url === OVERVIEW_URL ? Promise.resolve({ data: payload }) : Promise.resolve({ data: {} })
  );
};

// Renders the overview at /manager.
const renderOverview = () =>
  render(
    <MemoryRouter initialEntries={['/manager']}>
      <Routes>
        <Route path="/manager" element={<Overview />} />
      </Routes>
    </MemoryRouter>
  );

// Periods requested so far, in order.
const requestedPeriods = () =>
  api.get.mock.calls.filter(([url]) => url === OVERVIEW_URL).map(([, config]) => config?.params?.period);

// The MetricCard whose label is `label`.
const metricCard = (label) => screen.getByText(label).closest('.metric-card');

// The section card that holds the heading matching `name`.
const sectionByHeading = (name) => screen.getByRole('heading', { name }).closest('.section-card');

// Waits until the overview data has been rendered.
const waitForData = () => screen.findByText('Novos treinadores');

describe('Manager Overview', () => {
  beforeEach(() => {
    api.get.mockReset();
    mockOverview(buildOverview());
  });

  describe('period', () => {
    it('requests the overview for 30 days on mount', async () => {
      renderOverview();

      await waitFor(() => expect(api.get).toHaveBeenCalledWith(OVERVIEW_URL, { params: { period: '30d' } }));
      expect(requestedPeriods()).toEqual(['30d']);
    });

    it('renders the 7/30/90 dias Segmented with 30 dias active', async () => {
      const { container } = renderOverview();
      await waitForData();

      expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
      const segmented = container.querySelector('.segmented');
      expect(segmented).toBeInTheDocument();
      const thirty = within(segmented).getByRole('tab', { name: '30 dias' });
      expect(thirty).toHaveAttribute('aria-selected', 'true');
      expect(thirty).toHaveClass('segmented-item--active');
      expect(within(segmented).getByRole('tab', { name: '7 dias' })).toHaveAttribute('aria-selected', 'false');
      expect(within(segmented).getByRole('tab', { name: '90 dias' })).toBeInTheDocument();
    });

    it('refetches with period=7d when "7 dias" is clicked and marks it active', async () => {
      const user = userEvent.setup();
      renderOverview();
      await waitForData();

      await user.click(screen.getByRole('tab', { name: '7 dias' }));

      await waitFor(() => expect(api.get).toHaveBeenCalledWith(OVERVIEW_URL, { params: { period: '7d' } }));
      expect(requestedPeriods()).toEqual(['30d', '7d']);
      expect(screen.getByRole('tab', { name: '7 dias' })).toHaveClass('segmented-item--active');
    });

    it('refetches with period=90d when "90 dias" is clicked', async () => {
      const user = userEvent.setup();
      renderOverview();
      await waitForData();

      await user.click(screen.getByRole('tab', { name: '90 dias' }));

      await waitFor(() => expect(requestedPeriods()).toEqual(['30d', '90d']));
    });
  });

  describe('loading and error', () => {
    it('shows SkeletonRows while the overview request is pending', async () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      const { container } = renderOverview();

      expect(await screen.findByRole('status')).toBeInTheDocument();
      expect(container.querySelector('.skeleton-rows')).toBeInTheDocument();
      expect(screen.queryByText('Novos treinadores')).not.toBeInTheDocument();
    });

    it('shows an error Banner with the userMessage when the request fails', async () => {
      api.get.mockRejectedValue({ userMessage: 'Falha ao carregar a visão geral' });
      const { container } = renderOverview();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Falha ao carregar a visão geral');
      expect(container.querySelector('.ds-banner--error')).toBeInTheDocument();
      expect(container.querySelector('.skeleton-rows')).not.toBeInTheDocument();
      expect(screen.queryByText('Novos treinadores')).not.toBeInTheDocument();
    });
  });

  describe('KPIs', () => {
    it('renders four MetricCards inside the metric grid', async () => {
      const { container } = renderOverview();
      await waitForData();

      const grid = container.querySelector('.metric-grid');
      expect(grid).toBeInTheDocument();
      expect(grid.querySelectorAll('.metric-card')).toHaveLength(4);
      const labels = Array.from(grid.querySelectorAll('.metric-card-label')).map((node) => node.textContent);
      expect(labels).toEqual(['Novos treinadores', 'Novos alunos', 'Treinadores ativos', 'Sessões concluídas']);
    });

    it('shows the current value of each KPI', async () => {
      renderOverview();
      await waitForData();

      expect(metricCard('Novos treinadores').querySelector('.metric-card-value')).toHaveTextContent('18');
      expect(metricCard('Novos alunos').querySelector('.metric-card-value')).toHaveTextContent('47');
      expect(metricCard('Treinadores ativos').querySelector('.metric-card-value')).toHaveTextContent('9');
      expect(metricCard('Sessões concluídas').querySelector('.metric-card-value')).toHaveTextContent('312');
    });

    it('shows a positive delta as "+N" in a success pill on a neutral card', async () => {
      renderOverview();
      await waitForData();

      const card = metricCard('Novos treinadores');
      expect(card).toHaveClass('metric-card--neutral');
      const pill = card.querySelector('.metric-card-pill');
      expect(pill).toHaveTextContent(/\+6\b/);
      expect(pill.querySelector('.badge--success')).toBeInTheDocument();
      expect(metricCard('Sessões concluídas').querySelector('.metric-card-pill')).toHaveTextContent(/\+32\b/);
    });

    it('shows a negative delta with a minus sign in an error pill on a neutral card', async () => {
      renderOverview();
      await waitForData();

      const card = metricCard('Novos alunos');
      expect(card).toHaveClass('metric-card--neutral');
      const pill = card.querySelector('.metric-card-pill');
      expect(pill).toHaveTextContent(/[−-]3\b/);
      expect(pill.querySelector('.badge--error')).toBeInTheDocument();
    });

    it('shows a zero delta as "0" in a neutral pill without sign', async () => {
      renderOverview();
      await waitForData();

      const pill = metricCard('Treinadores ativos').querySelector('.metric-card-pill');
      expect(pill).toHaveTextContent(/\b0\b/);
      expect(pill).not.toHaveTextContent(/[+−]/);
      expect(pill.querySelector('.badge--neutral')).toBeInTheDocument();
      expect(pill.querySelector('.badge--success, .badge--error')).toBeNull();
    });
  });

  describe('weekly signups chart', () => {
    it('renders the ColumnChart image in a section card with the 8 week labels and both series', async () => {
      const { container } = renderOverview();
      await waitForData();

      const chart = screen.getByRole('img', { name: 'Cadastros por semana' });
      expect(chart).toHaveClass('column-chart');
      expect(chart.closest('.section-card')).toBeInTheDocument();
      WEEK_LABELS.forEach((label) => expect(within(chart).getByText(label)).toBeInTheDocument());
      expect(chart.querySelectorAll('.column-chart__group')).toHaveLength(8);
      expect(within(chart).getByText('Treinadores')).toBeInTheDocument();
      expect(within(chart).getByText('Alunos')).toBeInTheDocument();
      expect(container.querySelectorAll('.section-card').length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('iArnold card', () => {
    it('shows tokens, interactions, trainers, cache share and the USD cost of the month', async () => {
      renderOverview();
      await waitForData();

      const card = sectionByHeading(/iArnold/);
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent(/tokens/i);
      expect(card).toHaveTextContent('950');
      expect(card).toHaveTextContent(/interações/i);
      expect(card).toHaveTextContent('37');
      expect(card).toHaveTextContent(/treinadores/i);
      expect(card).toHaveTextContent('23');
      expect(card).toHaveTextContent('71%');
      expect(card).toHaveTextContent(/US\$\s?12,34/);
      expect(card).not.toHaveTextContent(/parcial/i);
    });

    it('renders the cache share as a ShareBar image', async () => {
      renderOverview();
      await waitForData();

      const card = sectionByHeading(/iArnold/);
      const bar = within(card).getByRole('img', { name: /cache/i });
      expect(bar).toHaveClass('share-bar');
    });

    it('adds a "parcial" note to the cost when costComplete is false', async () => {
      const base = buildOverview();
      mockOverview({ ...base, ai: { ...base.ai, costComplete: false } });
      renderOverview();
      await waitForData();

      expect(sectionByHeading(/iArnold/)).toHaveTextContent(/parcial/i);
    });

    it('lists the top trainers with a tier Badge, falling back to the email', async () => {
      renderOverview();
      await waitForData();

      const card = sectionByHeading(/iArnold/);
      const carlaRow = within(card).getByText('Carla Mendes').closest('li, tr');
      const carlaBadge = carlaRow.querySelector('.badge');
      expect(carlaBadge).toBeInTheDocument();
      expect(carlaBadge).toHaveTextContent('Pro');
      const diegoRow = within(card).getByText('diego@example.com').closest('li, tr');
      expect(diegoRow.querySelector('.badge')).toHaveTextContent('Beta');
    });
  });

  describe('plans distribution', () => {
    it('renders the plans ShareBar in a section card with every tier and its count', async () => {
      renderOverview();
      await waitForData();

      const bar = screen.getByRole('img', { name: 'Treinadores por plano' });
      expect(bar).toHaveClass('share-bar');
      const card = bar.closest('.section-card');
      expect(card).toBeInTheDocument();
      ['Grátis', 'Pro', 'Platinum', 'Diamond', 'Beta'].forEach((label) => expect(card).toHaveTextContent(label));
      ['20', '10', '15'].forEach((count) => expect(card).toHaveTextContent(count));
    });
  });

  describe('pendências', () => {
    it('links each pending count to its manager page', async () => {
      renderOverview();
      await waitForData();

      const card = sectionByHeading('Pendências');
      expect(card).toBeInTheDocument();
      const invites = within(card).getByRole('link', { name: /convite/i });
      expect(invites).toHaveAttribute('href', '/manager/invites');
      expect(invites).toHaveTextContent('4');
      const feedbacks = within(card).getByRole('link', { name: /feedback/i });
      expect(feedbacks).toHaveAttribute('href', '/manager/feedbacks');
      expect(feedbacks).toHaveTextContent('2');
      const withoutStudents = within(card).getByRole('link', { name: /sem alunos?/i });
      expect(withoutStudents).toHaveAttribute('href', '/manager/trainers');
      expect(withoutStudents).toHaveTextContent('3');
    });
  });

  describe('latest trainers', () => {
    it('links each trainer to its manager user page with an Avatar', async () => {
      renderOverview();
      await waitForData();

      const card = sectionByHeading('Últimos treinadores');
      expect(card).toBeInTheDocument();
      expect(within(card).getByRole('link', { name: /Bruno Costa/ })).toHaveAttribute('href', '/manager/users/u-7');
      expect(within(card).getByRole('link', { name: /elisa@example\.com/ })).toHaveAttribute('href', '/manager/users/u-8');
      expect(card.querySelectorAll('.avatar')).toHaveLength(2);
    });
  });

  describe('all-zero payload', () => {
    it('renders every block with zeroes and no NaN', async () => {
      mockOverview(buildZeroOverview());
      const { container } = renderOverview();
      await waitForData();

      expect(container.querySelectorAll('.metric-card')).toHaveLength(4);
      expect(metricCard('Novos treinadores').querySelector('.metric-card-value')).toHaveTextContent('0');
      expect(screen.getByRole('img', { name: 'Cadastros por semana' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Treinadores por plano' })).toBeInTheDocument();
      expect(sectionByHeading(/iArnold/)).toHaveTextContent('0%');
      expect(sectionByHeading('Pendências')).toBeInTheDocument();
      expect(sectionByHeading('Últimos treinadores')).toBeInTheDocument();
      expect(container.textContent).not.toContain('NaN');
      expect(container.innerHTML).not.toContain('NaN');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
