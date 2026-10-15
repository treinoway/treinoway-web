import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import TemplateGallery from './TemplateGallery';

const templates = [
  { id: 't-1', title: 'Triagem PAR-Q', category: 'screening', categoryLabel: 'Triagem', questionCount: 7 },
  { id: 't-2', title: 'Hipertrofia iniciante', category: 'hypertrophy', categoryLabel: 'Hipertrofia', questionCount: 12 },
  { id: 't-3', title: 'Anamnese da plataforma', category: null, categoryLabel: null, questionCount: 20 },
];

const renderGallery = (props = {}) => {
  const handlers = {
    onRetry: vi.fn(),
    onPreview: vi.fn(),
    onUse: vi.fn(),
    onCreateFromScratch: vi.fn(),
  };
  render(<TemplateGallery templates={templates} {...handlers} {...props} />);
  return handlers;
};

const cardTitles = () => screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

describe('TemplateGallery', () => {
  it('renders one card per template, with or without category', () => {
    renderGallery();
    expect(cardTitles()).toEqual(['Triagem PAR-Q', 'Hipertrofia iniciante', 'Anamnese da plataforma']);
  });

  it('shows "Todos" plus one chip per category present', () => {
    renderGallery();
    const group = screen.getByRole('group', { name: 'Filtrar modelos por categoria' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Triagem' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hipertrofia' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Emagrecimento' })).not.toBeInTheDocument();
  });

  it('filters the cards client-side by category and back to all', async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByRole('button', { name: 'Hipertrofia' }));
    expect(cardTitles()).toEqual(['Hipertrofia iniciante']);
    expect(screen.getByRole('button', { name: 'Hipertrofia' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    expect(cardTitles()).toHaveLength(3);
  });

  it('hides the chips when no template has a category (older API)', () => {
    renderGallery({
      templates: [
        { id: 'old-1', title: 'Anamnese geral' },
        { id: 'old-2', title: 'Anamnese esportiva' },
      ],
    });
    expect(screen.queryByRole('group', { name: 'Filtrar modelos por categoria' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(document.body).not.toHaveTextContent(/undefined|NaN/);
  });

  it('forwards preview and use clicks', async () => {
    const user = userEvent.setup();
    const { onPreview, onUse } = renderGallery();
    const [firstPreview] = screen.getAllByRole('button', { name: 'Pré-visualizar' });
    const [firstUse] = screen.getAllByRole('button', { name: 'Usar este modelo' });

    await user.click(firstPreview);
    await user.click(firstUse);

    expect(onPreview).toHaveBeenCalledWith(templates[0]);
    expect(onUse).toHaveBeenCalledWith(templates[0]);
  });

  it('shows "Carregando..." on the copied card and disables the others', () => {
    renderGallery({ copyingId: 't-2' });
    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
    screen.getAllByRole('button', { name: 'Usar este modelo' }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('renders the loading state', () => {
    renderGallery({ loading: true });
    expect(screen.getByRole('status', { name: 'Carregando modelos' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('renders the error state with retry', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderGallery({ error: true });
    expect(screen.getByText('Não foi possível carregar os modelos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state with a shortcut to create from scratch', async () => {
    const user = userEvent.setup();
    const { onCreateFromScratch } = renderGallery({ templates: [] });
    expect(screen.getByText('Nenhum modelo ainda')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar do zero' }));
    expect(onCreateFromScratch).toHaveBeenCalledTimes(1);
  });
});
