import { screen, waitFor, within, renderWithRouter } from '../test/test-utils';
import ManagerLayout from './ManagerLayout';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const PENDING_URL = '/admin/manager/pending';

const NAV_ITEMS = [
  { name: 'Visão geral', href: '/manager' },
  { name: 'Usuários', href: '/manager/users' },
  { name: 'Trainers e planos', href: '/manager/trainers' },
  { name: 'Convites do beta', href: '/manager/invites' },
  { name: 'Feedbacks', href: '/manager/feedbacks' },
  { name: 'Uso do iArnold', href: '/manager/ai-usage' },
  { name: 'Tutoriais', href: '/manager/tutorials' },
];

// Answers the pending request with the given counts.
const mockPending = (pending) => {
  api.get.mockImplementation((url) =>
    url === PENDING_URL ? Promise.resolve({ data: pending }) : Promise.resolve({ data: {} })
  );
};

// Renders the manager shell at `route`.
const renderLayout = (route = '/manager') =>
  renderWithRouter(
    <ManagerLayout>
      <span>Conteúdo</span>
    </ManagerLayout>,
    { route }
  );

// Escapes a label for use inside a RegExp.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The side-nav link whose accessible name starts with `name`.
const navLink = (name) =>
  within(screen.getByRole('navigation')).getByRole('link', { name: new RegExp(`^${escapeRegExp(name)}`) });

// Names of the nav items currently marked as the page.
const currentItems = () =>
  Array.from(screen.getByRole('navigation').querySelectorAll('.nav-item[aria-current="page"]')).map((link) =>
    link.textContent.replace(/\d+/g, '').trim()
  );

describe('ManagerLayout side nav', () => {
  beforeEach(() => {
    api.get.mockReset();
    mockPending({ pendingInvites: 0, newFeedbacks: 0 });
  });

  it('lists the seven manager sections in order with their hrefs, each a .nav-item', () => {
    renderLayout();

    const nav = screen.getByRole('navigation');
    const items = Array.from(nav.querySelectorAll('a.nav-item'));
    expect(items).toHaveLength(7);
    NAV_ITEMS.forEach(({ name, href }, index) => {
      expect(items[index]).toHaveTextContent(name);
      expect(navLink(name)).toHaveAttribute('href', href);
      expect(navLink(name)).toHaveClass('nav-item');
    });
  });

  it('keeps the title, renders the content and links back to the app home', () => {
    renderLayout();

    expect(screen.getByText('Teufit Manager')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar ao app/ })).toHaveAttribute('href', '/');
  });

  it.each([
    ['/manager', 'Visão geral'],
    ['/manager/users', 'Usuários'],
    ['/manager/users/u1', 'Usuários'],
    ['/manager/protocols/p1', 'Usuários'],
    ['/manager/sessions/s1', 'Usuários'],
    ['/manager/trainers', 'Trainers e planos'],
    ['/manager/invites', 'Convites do beta'],
    ['/manager/feedbacks', 'Feedbacks'],
    ['/manager/ai-usage', 'Uso do iArnold'],
    ['/manager/tutorials', 'Tutoriais'],
  ])('at %s marks only "%s" with aria-current="page"', (route, active) => {
    renderLayout(route);

    expect(navLink(active)).toHaveAttribute('aria-current', 'page');
    expect(currentItems()).toEqual([active]);
  });

  it('does not mark Visão geral as current on a nested manager route', () => {
    renderLayout('/manager/trainers');

    expect(navLink('Visão geral')).not.toHaveAttribute('aria-current');
  });

  it('requests the pending counts and shows them as pills on Convites do beta and Feedbacks', async () => {
    mockPending({ pendingInvites: 4, newFeedbacks: 2 });
    renderLayout();

    await waitFor(() => expect(navLink('Convites do beta')).toHaveTextContent('4'));
    expect(navLink('Feedbacks')).toHaveTextContent('2');
    expect(api.get.mock.calls.some(([url]) => url === PENDING_URL)).toBe(true);
    expect(navLink('Usuários')).not.toHaveTextContent(/\d/);
  });

  it('hides the pills when the counts are zero', async () => {
    renderLayout();

    await waitFor(() => expect(api.get.mock.calls.some(([url]) => url === PENDING_URL)).toBe(true));
    expect(navLink('Convites do beta')).not.toHaveTextContent(/\d/);
    expect(navLink('Feedbacks')).not.toHaveTextContent(/\d/);
  });

  it('keeps the nav without pills when the pending request fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falhou' });
    renderLayout();

    await waitFor(() => expect(api.get.mock.calls.some(([url]) => url === PENDING_URL)).toBe(true));
    expect(screen.getByRole('navigation').querySelectorAll('a.nav-item')).toHaveLength(7);
    expect(navLink('Convites do beta')).not.toHaveTextContent(/\d/);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });
});
