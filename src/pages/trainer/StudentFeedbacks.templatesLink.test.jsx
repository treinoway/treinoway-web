import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast: vi.fn() }),
}));

import api from '../../api/axios';
import StudentFeedbacks from './StudentFeedbacks';

const BASE_URL = '/trainer/student-feedbacks';
const EMPTY_PAYLOAD = { summary: { responseRate30d: null, averageIndex: null, unansweredCount: 0, unreadCount: 0 }, items: [] };

const DS = { SecondaryButton: 'btn--secondary' };

// Answers the inbox requests; any other GET fails, as in the inbox tests
const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === BASE_URL) return Promise.resolve({ data: EMPTY_PAYLOAD });
    if (url === `${BASE_URL}/unread-count`) return Promise.resolve({ data: { count: 0 } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Renders the inbox with markers for the templates and the settings routes
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[BASE_URL]}>
      <Routes>
        <Route path="/trainer/student-feedbacks" element={<StudentFeedbacks />} />
        <Route path="/trainer/student-feedbacks/templates" element={<div>Templates Page</div>} />
        <Route path="/trainer/student-feedbacks/settings" element={<div>Settings Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// The "Modelos" action of the header, whether it is a link or a button
const templatesAction = () => screen.queryByRole('link', { name: 'Modelos' }) ?? screen.getByRole('button', { name: 'Modelos' });

describe('StudentFeedbacks — "Modelos"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('shows "Modelos" as a secondary action next to "Configurar feedback"', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Feedbacks' });

    expect(templatesAction()).toHaveClass('btn', DS.SecondaryButton);
    expect(templatesAction().parentElement).toBe(screen.getByRole('button', { name: 'Configurar feedback' }).parentElement);
    expect(screen.getByRole('button', { name: 'Configurar feedback' })).toHaveClass('btn', DS.SecondaryButton);
  });

  it('opens the template list from "Modelos"', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Feedbacks' });

    await user.click(templatesAction());

    expect(await screen.findByText('Templates Page')).toBeInTheDocument();
  });

  it('offers "Modelos" while the inbox is still loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(templatesAction()).toBeEnabled();
  });

  it('still opens the settings from "Configurar feedback"', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Feedbacks' });
    expect(templatesAction()).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Configurar feedback' }));

    expect(await screen.findByText('Settings Page')).toBeInTheDocument();
  });
});
