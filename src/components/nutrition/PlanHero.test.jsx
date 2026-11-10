import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import PlanHero from './PlanHero';
import { buildPatientRow } from '../../test/nutritionFixtures';

// Test helper: renders the hero with defaults.
const renderHero = (props = {}) => {
  const handlers = { onSaveDraft: vi.fn(), onPublish: vi.fn() };
  render(
    <PlanHero
      patient={buildPatientRow()}
      plan={{ status: 'draft', hasUnpublishedChanges: false }}
      statusLines={['Rascunho']}
      publishing={false}
      {...handlers}
      {...props}
    >
      <p>slot</p>
    </PlanHero>,
  );
  return handlers;
};

describe('PlanHero', () => {
  it('shows the avatar initials, eyebrow, name and facts with the objective', () => {
    renderHero();
    expect(screen.getByText('LA')).toBeInTheDocument();
    expect(screen.getByText('Paciente · Plano alimentar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Luiza Andrade' })).toBeInTheDocument();
    expect(screen.getByText('29 anos · 66 kg · Objetivo: Déficit moderado')).toBeInTheDocument();
  });

  it('omits unknown facts and the objective', () => {
    renderHero({ patient: buildPatientRow({ age: null, weightKg: null, objective: null }) });
    expect(screen.queryByText(/anos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Objetivo/)).not.toBeInTheDocument();
  });

  it('renders the children below the header', () => {
    renderHero();
    expect(screen.getByText('slot')).toBeInTheDocument();
  });

  it('shows the status text and both actions for a draft', async () => {
    const user = userEvent.setup();
    const handlers = renderHero();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await user.click(screen.getByRole('button', { name: 'Publicar plano' }));
    expect(handlers.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(handlers.onPublish).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Publicado')).not.toBeInTheDocument();
  });

  it('shows the published state instead of the publish button when nothing is pending', () => {
    renderHero({ plan: { status: 'published', hasUnpublishedChanges: false }, statusLines: ['Salvo'] });
    expect(screen.queryByRole('button', { name: 'Publicar plano' })).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Plano publicado' })).toHaveTextContent('Publicado');
    expect(screen.getByText('Salvo')).toBeInTheDocument();
  });

  it('offers to publish again when a published plan has unpublished changes', () => {
    renderHero({ plan: { status: 'published', hasUnpublishedChanges: true }, statusLines: ['Alterações não publicadas'] });
    expect(screen.getByText('Alterações não publicadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeInTheDocument();
  });

  it('disables the actions while publishing', () => {
    renderHero({ publishing: true });
    expect(screen.getByRole('button', { name: 'Publicando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
  });
});
