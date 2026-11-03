import { screen, renderWithRouter } from '../test/test-utils';
import ManagerLayout from './ManagerLayout';

describe('Manager top bar', () => {
  it('renders the Teufit Manager title, a link back to the app and the content', () => {
    renderWithRouter(
      <ManagerLayout>
        <span>Conteúdo</span>
      </ManagerLayout>
    );

    expect(screen.getByText('Teufit Manager')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar ao app/ })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });
});
