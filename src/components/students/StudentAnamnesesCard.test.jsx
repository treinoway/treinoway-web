import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import StudentAnamnesesCard from './StudentAnamnesesCard';
import { buildAnamnesisLink, linkResponses } from '../../test/anamnesisLinkFixtures';

const renderCard = (anamneses, props = {}) => {
  const handlers = { onViewAll: vi.fn(), onLink: vi.fn(), onFill: vi.fn(), onViewResponses: vi.fn() };
  render(<StudentAnamnesesCard anamneses={anamneses} loading={false} {...handlers} {...props} />);
  return handlers;
};

describe('StudentAnamnesesCard', () => {
  it('renders the heading with the total and the link action', async () => {
    const user = userEvent.setup();
    const handlers = renderCard([buildAnamnesisLink({ id: 'a1', title: 'Avaliação postural', response: null, canFill: true })]);
    expect(screen.getByRole('heading', { name: 'Anamneses' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver todas as 1 anamneses' }));
    await user.click(screen.getByRole('button', { name: 'Vincular anamnese' }));
    expect(handlers.onViewAll).toHaveBeenCalledTimes(1);
    expect(handlers.onLink).toHaveBeenCalledTimes(1);
  });

  it('shows a pending link with its link date and a direct fill action', async () => {
    const user = userEvent.setup();
    const link = buildAnamnesisLink({ id: 'a1', title: 'Avaliação postural', response: null, canFill: true });
    const handlers = renderCard([link]);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText(/Vinculada em/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /opções da anamnese/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preencher com o aluno' }));
    expect(handlers.onFill).toHaveBeenCalledWith(link);
  });

  it('shows no action when there is nothing to fill or view', () => {
    renderCard([buildAnamnesisLink({ id: 'a1', title: 'Rascunho', response: linkResponses.draft, canFill: false })]);
    expect(screen.getByText('Em preenchimento')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preencher com o aluno' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver respostas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /opções da anamnese/i })).not.toBeInTheDocument();
  });

  it('uses a direct button when only one action applies', async () => {
    const user = userEvent.setup();
    const link = buildAnamnesisLink({ id: 'a1', title: 'Anamnese completa', response: linkResponses.submitted, canFill: false });
    const handlers = renderCard([link]);
    expect(screen.getByText('Respondida')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver respostas' }));
    expect(handlers.onViewResponses).toHaveBeenCalledWith(link);
  });

  it('groups two actions in a row menu', async () => {
    const user = userEvent.setup();
    const link = buildAnamnesisLink({ id: 'a1', title: 'Legado' });
    const handlers = renderCard([link]);
    await user.click(screen.getByRole('button', { name: 'Opções da anamnese Legado' }));
    await user.click(screen.getByRole('button', { name: 'Preencher com o aluno' }));
    expect(handlers.onFill).toHaveBeenCalledWith(link);
  });

  it('shows at most two links, pending first', () => {
    renderCard([
      buildAnamnesisLink({ id: 'a1', title: 'Enviada', response: linkResponses.submitted, canFill: false }),
      buildAnamnesisLink({ id: 'a2', title: 'Rascunho', response: linkResponses.draft, canFill: true }),
      buildAnamnesisLink({ id: 'a3', title: 'Pendente X', response: null, canFill: true }),
    ]);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Pendente X');
    expect(items[1]).toHaveTextContent('Rascunho');
  });

  it('shows the empty state with a single link action', () => {
    renderCard([]);
    expect(screen.getByText('Sem anamneses vinculadas')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Vincular anamnese' })).toHaveLength(1);
  });

  it('hides content while loading', () => {
    renderCard([], { loading: true });
    expect(screen.queryByText('Sem anamneses vinculadas')).not.toBeInTheDocument();
  });
});
