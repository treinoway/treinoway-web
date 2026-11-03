import { screen, waitFor, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SessionsTab, TemplatesTab } from './UserTabs';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

describe('UserTabs', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 20 } });
  });

  it('SessionsTab requests the user sessions', async () => {
    render(
      <MemoryRouter>
        <SessionsTab userId="u1" />
      </MemoryRouter>
    );

    await waitFor(() => expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users/u1/sessions'));
  });

  it('TemplatesTab switches between training and exercise templates', async () => {
    render(
      <MemoryRouter>
        <TemplatesTab userId="u1" />
      </MemoryRouter>
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0][1].params.type).toBe('training');

    await userEvent.setup().click(screen.getAllByRole('tab')[1]);

    await waitFor(() => expect(api.get.mock.calls.at(-1)[1].params.type).toBe('exercise'));
  });
});
