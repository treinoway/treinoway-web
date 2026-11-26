import { screen, waitFor, render, act } from '../../test/test-utils';
import { MemoryRouter } from 'react-router-dom';
import Overview from './Overview';
import Segmented from '../../components/ds/Segmented';
import MetricCard from '../../components/ds/MetricCard';
import ColumnChart from '../../components/ds/ColumnChart';
import ShareBar from '../../components/ds/ShareBar';
import Badge from '../../components/ds/Badge';
import Avatar from '../../components/ds/Avatar';
import SkeletonRows from '../../components/ds/SkeletonRows';
import Banner from '../../components/ds/Banner';
import api from '../../api/axios';
import { buildOverview, WEEK_LABELS } from '../../test/managerOverviewFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../components/ds/Segmented', () => ({
  default: vi.fn(({ ariaLabel }) => <div role="tablist" aria-label={ariaLabel} />),
}));
vi.mock('../../components/ds/MetricCard', () => ({
  default: vi.fn(({ label }) => <div>{`metric:${label}`}</div>),
}));
vi.mock('../../components/ds/ColumnChart', () => ({
  default: vi.fn(({ ariaLabel }) => <div role="img" aria-label={ariaLabel} />),
}));
vi.mock('../../components/ds/ShareBar', () => ({
  default: vi.fn(({ ariaLabel }) => <div role="img" aria-label={ariaLabel} />),
}));
vi.mock('../../components/ds/Badge', () => ({
  default: vi.fn(({ children }) => <span>{children}</span>),
}));
vi.mock('../../components/ds/Avatar', () => ({
  default: vi.fn(() => <span aria-hidden="true" />),
}));
vi.mock('../../components/ds/SkeletonRows', () => ({
  default: vi.fn(({ label }) => <div role="status" aria-label={label}>skeleton-spy</div>),
}));
vi.mock('../../components/ds/Banner', () => ({
  default: vi.fn(({ children }) => <div role="alert">{children}</div>),
}));

const OVERVIEW_URL = '/admin/manager/overview';

// Renders the overview inside a router.
const renderOverview = () =>
  render(
    <MemoryRouter initialEntries={['/manager']}>
      <Overview />
    </MemoryRouter>
  );

// Props of the latest render of a mocked component.
const lastProps = (component) => component.mock.calls[component.mock.calls.length - 1][0];

// Props of every call of a mocked component.
const allProps = (component) => component.mock.calls.map(([props]) => props);

// Waits until the four KPI cards have been rendered.
const waitForData = () => screen.findByText('metric:Novos treinadores');

describe('Overview design-system components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) =>
      url === OVERVIEW_URL ? Promise.resolve({ data: buildOverview() }) : Promise.resolve({ data: {} })
    );
  });

  it('uses Segmented for the 7/30/90-day period with 30d selected, and its onChange refetches', async () => {
    renderOverview();
    await waitForData();

    const props = lastProps(Segmented);
    expect(props.items.map((item) => item.id)).toEqual(['7d', '30d', '90d']);
    expect(props.items.map((item) => item.label)).toEqual(['7 dias', '30 dias', '90 dias']);
    expect(props.value).toBe('30d');

    act(() => props.onChange('90d'));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(OVERVIEW_URL, { params: { period: '90d' } }));
    await waitFor(() => expect(lastProps(Segmented).value).toBe('90d'));
  });

  it('renders the four KPIs with MetricCard', async () => {
    renderOverview();
    await waitForData();

    const labels = allProps(MetricCard).map((props) => props.label);
    ['Novos treinadores', 'Novos alunos', 'Treinadores ativos', 'Sessões concluídas'].forEach((label) =>
      expect(labels).toContain(label)
    );
    const newTrainers = allProps(MetricCard).find((props) => props.label === 'Novos treinadores');
    expect(String(newTrainers.value)).toBe('18');
    expect(newTrainers.pill).toBeTruthy();
  });

  it('renders the weekly signups with ColumnChart: two series and 8 weekly columns', async () => {
    renderOverview();
    await waitForData();

    expect(ColumnChart).toHaveBeenCalled();
    const props = lastProps(ColumnChart);
    expect(props.ariaLabel).toBe('Cadastros por semana');
    expect(props.series.map((serie) => serie.label)).toEqual(['Treinadores', 'Alunos']);
    expect(props.columns).toHaveLength(8);
    expect(props.columns.map((column) => column.label)).toEqual(WEEK_LABELS);
    expect(props.columns[0].values).toEqual([1, 4]);
    expect(props.columns[7].values).toEqual([8, 11]);
    expect(screen.getByRole('img', { name: 'Cadastros por semana' })).toBeInTheDocument();
  });

  it('renders the plan split and the cache share with ShareBar', async () => {
    renderOverview();
    await waitForData();

    const calls = allProps(ShareBar);
    const plans = calls.find((props) => props.ariaLabel === 'Treinadores por plano');
    expect(plans).toBeDefined();
    expect(plans.segments.map((segment) => segment.label)).toEqual(['Grátis', 'Pro', 'Platinum', 'Diamond', 'Beta']);
    expect(plans.segments.map((segment) => segment.value)).toEqual([20, 10, 5, 0, 15]);
    const cache = calls.find((props) => /cache/i.test(props.ariaLabel));
    expect(cache).toBeDefined();
    expect(cache.segments.length).toBeGreaterThan(0);
  });

  it('renders tier tags with Badge and latest trainers with Avatar', async () => {
    renderOverview();
    await waitForData();

    const badgeTexts = allProps(Badge).map((props) => props.children);
    expect(badgeTexts).toEqual(expect.arrayContaining(['Pro', 'Beta']));
    const avatarNames = allProps(Avatar).map((props) => props.name);
    expect(avatarNames).toEqual(expect.arrayContaining(['Bruno Costa', 'elisa@example.com']));
  });

  it('renders SkeletonRows while loading and not Banner', async () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderOverview();

    await waitFor(() => expect(SkeletonRows).toHaveBeenCalled());
    expect(screen.getByText('skeleton-spy')).toBeInTheDocument();
    expect(Banner).not.toHaveBeenCalled();
    expect(MetricCard).not.toHaveBeenCalled();
  });

  it('renders Banner with tone="error" on failure', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha X' });
    renderOverview();

    await waitFor(() => expect(Banner).toHaveBeenCalled());
    expect(allProps(Banner).some((props) => props.tone === 'error')).toBe(true);
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha X');
  });
});
