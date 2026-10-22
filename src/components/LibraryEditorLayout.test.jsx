import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import LibraryEditorLayout from './LibraryEditorLayout';

const baseProps = {
  title: 'Treino A',
  state: 'ready',
  loadingLabel: 'Carregando treino',
  errorTitle: 'Não foi possível carregar',
  errorDescription: 'Falha de rede',
  notFound: { title: 'Não encontrado', description: 'Link incorreto', actionLabel: 'Voltar para lista' },
  onBack: vi.fn(),
  onRetry: vi.fn(),
};

const renderLayout = (props = {}) =>
  render(<LibraryEditorLayout {...baseProps} {...props}><p>conteúdo</p></LibraryEditorLayout>);

describe('LibraryEditorLayout', () => {
  beforeEach(() => {
    baseProps.onBack.mockReset();
    baseProps.onRetry.mockReset();
  });

  it('renders the title and children when ready', () => {
    renderLayout();
    expect(screen.getByRole('heading', { level: 1, name: 'Treino A' })).toBeInTheDocument();
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('renders skeletons instead of the content while loading', () => {
    renderLayout({ state: 'loading' });
    expect(screen.getByRole('status', { name: 'Carregando treino' })).toBeInTheDocument();
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
    expect(screen.queryByText('Não encontrado')).not.toBeInTheDocument();
  });

  it('renders the not-found block whose action goes back', async () => {
    renderLayout({ state: 'notFound' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Voltar para lista' }));
    expect(baseProps.onBack).toHaveBeenCalled();
  });

  it('renders an alert with a retry action on error', async () => {
    renderLayout({ state: 'error' });
    expect(screen.getByRole('alert')).toHaveTextContent('Falha de rede');
    await userEvent.setup().click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(baseProps.onRetry).toHaveBeenCalled();
  });

  it('calls onBack from the ghost back button', async () => {
    renderLayout();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Voltar' }));
    expect(baseProps.onBack).toHaveBeenCalled();
  });
});
