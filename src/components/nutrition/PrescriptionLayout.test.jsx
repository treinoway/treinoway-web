import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { render, renderWithRouter, screen, waitFor } from '../../test/test-utils';
import { MemoryRouter } from 'react-router-dom';
import PrescriptionLayout from './PrescriptionLayout';

const PATIENT = { id: 'p1', firstName: 'Luiza', lastName: 'Andrade', weightKg: 66 };

// Test helper: renders the layout on the goals route with a sibling route to observe navigation.
const renderAt = (props) => render(
  <MemoryRouter initialEntries={['/nutritionist/patients/p1/plan/goals']}>
    <Routes>
      <Route path="/nutritionist/patients/p1/plan/goals" element={<PrescriptionLayout step="goals" patient={PATIENT} title="Metas" {...props}><p>conteúdo</p></PrescriptionLayout>} />
      <Route path="*" element={<p>outra tela</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('PrescriptionLayout', () => {
  it('renders breadcrumb, eyebrow, title, subtitle, stepper, summary link and the save status', () => {
    renderWithRouter(
      <PrescriptionLayout step="goals" patient={PATIENT} title="Metas" subtitle="Subtítulo" saveStatusText="Salvo automaticamente às 14:05">
        <p>conteúdo</p>
      </PrescriptionLayout>,
    );
    expect(screen.getByRole('navigation', { name: 'Você está em' })).toBeInTheDocument();
    expect(screen.getByText('Prescrição · Luiza Andrade · 66 kg')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Metas' })).toBeInTheDocument();
    expect(screen.getByText('Subtítulo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Etapas da prescrição' })).toBeInTheDocument();
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Visualização do plano' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Prescrição detalhada' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Prescrição simples' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('link', { name: 'Ver resumo do plano' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Salvo automaticamente às 14:05');
  });

  it('omits the weight from the eyebrow when unknown and flags unpublished changes', () => {
    renderWithRouter(
      <PrescriptionLayout step="goals" patient={{ id: 'p1', firstName: 'Luiza' }} plan={{ hasUnpublishedChanges: true }} title="Metas">
        <p>x</p>
      </PrescriptionLayout>,
    );
    expect(screen.getByText('Prescrição · Luiza')).toBeInTheDocument();
    expect(screen.getByText('Alterações não publicadas')).toBeInTheDocument();
  });

  it('shows a default save hint while nothing was saved yet', () => {
    renderWithRouter(<PrescriptionLayout step="goals" patient={PATIENT} title="Metas"><p>x</p></PrescriptionLayout>);
    expect(screen.getByRole('status')).toHaveTextContent('As alterações são salvas automaticamente.');
  });

  it('offers only the next step on Metas', () => {
    renderWithRouter(<PrescriptionLayout step="goals" patient={PATIENT} title="Metas"><p>x</p></PrescriptionLayout>);
    expect(screen.getByRole('link', { name: /Próximo: Cardápio/ })).toHaveAttribute('href', '/nutritionist/patients/p1/plan/menu');
    expect(screen.queryByRole('link', { name: /^Metas$/ })).not.toBeInTheDocument();
  });

  it('offers back and next on Cardápio', () => {
    renderWithRouter(<PrescriptionLayout step="menu" patient={PATIENT} title="Cardápio"><p>x</p></PrescriptionLayout>);
    expect(screen.getByRole('link', { name: 'Metas' })).toHaveAttribute('href', '/nutritionist/patients/p1/plan/goals');
    expect(screen.getByRole('link', { name: /Próximo: Orientações/ })).toHaveAttribute('href', '/nutritionist/patients/p1/plan/guidance');
  });

  it('on the last step offers back, no next and renders the extra action', () => {
    renderWithRouter(
      <PrescriptionLayout step="guidance" patient={PATIENT} title="Orientações" footerExtra={<button type="button">Publicar plano</button>}>
        <p>x</p>
      </PrescriptionLayout>,
    );
    screen.getAllByRole('link', { name: 'Cardápio' }).forEach((link) => expect(link).toHaveAttribute('href', '/nutritionist/patients/p1/plan/menu'));
    expect(screen.queryByRole('link', { name: /Próximo/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeInTheDocument();
  });

  it('waits for onBeforeNavigate before moving to the next step', async () => {
    const user = userEvent.setup();
    const onBeforeNavigate = vi.fn().mockResolvedValue(true);
    renderAt({ onBeforeNavigate });

    await user.click(screen.getByRole('link', { name: /Próximo: Cardápio/ }));

    expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('outra tela')).toBeInTheDocument();
  });

  it('stays on the page when the pending save fails', async () => {
    const user = userEvent.setup();
    const onBeforeNavigate = vi.fn().mockResolvedValue(false);
    renderAt({ onBeforeNavigate });

    await user.click(screen.getByRole('link', { name: /Próximo: Cardápio/ }));
    await user.click(screen.getByRole('tab', { name: 'Prescrição simples' }));

    await waitFor(() => expect(onBeforeNavigate).toHaveBeenCalledTimes(2));
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
    expect(screen.queryByText('outra tela')).not.toBeInTheDocument();
  });

  it('offers a retry when the save failed', async () => {
    const user = userEvent.setup();
    const onRetrySave = vi.fn();
    renderAt({ saveStatus: 'error', saveStatusText: 'Não foi possível salvar.', onRetrySave });

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetrySave).toHaveBeenCalledTimes(1);
  });
});
