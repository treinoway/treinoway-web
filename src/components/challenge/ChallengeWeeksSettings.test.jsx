import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';
import { render, screen, within, waitFor } from '../../test/test-utils';
import ChallengeWeeksSettings from './ChallengeWeeksSettings';
import { useToast } from '../../contexts/ToastContext';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const TIME_ZONE = 'America/Sao_Paulo';

// Weekly championship as GET /trainer/challenges/:id returns it
const challengeOf = (overrides = {}) => ({
  id: 'c1',
  name: 'Verão 2027',
  description: 'Prêmio: camiseta',
  status: 'scheduled',
  format: 'weeks',
  startDate: '2099-01-05',
  endDate: '2099-02-01',
  weeks: 4,
  minPodiumWeeks: 2,
  anonymousRanking: false,
  closeRequestedAt: null,
  ...overrides,
});

// Renders the settings inside a router with a link to another page
const renderSettings = (challenge = challengeOf(), props = {}) => {
  const handlers = {
    onSave: vi.fn().mockResolvedValue(undefined),
    onCloseEarly: vi.fn().mockResolvedValue({ closesAt: '2026-11-23T00:00:00Z' }),
    onCancel: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onDirtyChange: vi.fn(),
    ...props,
  };
  render(
    <MemoryRouter initialEntries={['/trainer/challenges/c1']}>
      <Routes>
        <Route
          path="/trainer/challenges/c1"
          element={(
            <>
              <Link to="/trainer/students">Meus Alunos</Link>
              <ChallengeWeeksSettings challenge={challenge} timeZone={TIME_ZONE} {...handlers} />
            </>
          )}
        />
        <Route path="/trainer/students" element={<p>Página de alunos</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return handlers;
};

// Form controls and the open confirm dialog, by their accessible names
const nameInput = () => screen.getByLabelText('Nome');
// Description textarea
const descriptionInput = () => screen.getByLabelText('Descrição');
// Start Monday select
const startSelect = () => screen.getByLabelText('Segunda de início');
// Number of weeks select
const weeksSelect = () => screen.getByLabelText('Semanas');
// Podium minimum select
const podiumSelect = () => screen.getByLabelText('Mínimo para o pódio');
// Anonymous ranking switch
const anonymousSwitch = () => screen.getByRole('switch', { name: 'Ranking anônimo' });
// Open confirm dialog
const dialog = () => screen.getByRole('alertdialog');

describe('ChallengeWeeksSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast: vi.fn() });
  });

  it('CAMP-39 edits every field of a scheduled weekly championship', async () => {
    const user = userEvent.setup();
    const { onSave } = renderSettings();

    [nameInput(), descriptionInput(), startSelect(), weeksSelect(), podiumSelect(), anonymousSwitch()].forEach((field) => expect(field).toBeEnabled());

    await user.clear(nameInput());
    await user.type(nameInput(), 'Inverno 2027');
    await user.clear(descriptionInput());
    await user.type(descriptionInput(), 'Prêmio: garrafa');
    const nextMonday = within(startSelect()).getAllByRole('option')[1].value;
    await user.selectOptions(startSelect(), nextMonday);
    await user.selectOptions(weeksSelect(), '8');
    await user.selectOptions(podiumSelect(), '3');
    await user.click(anonymousSwitch());
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Inverno 2027',
      description: 'Prêmio: garrafa',
      startWeek: nextMonday,
      weeks: 8,
      minPodiumWeeks: 3,
      anonymousRanking: true,
    });
  });

  it('CAMP-39 offers the podium minimum only up to min(4, weeks)', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.selectOptions(weeksSelect(), '2');

    expect(within(podiumSelect()).getAllByRole('option').map((option) => option.value)).toEqual(['1', '2']);
    expect(podiumSelect()).toHaveValue('2');
  });

  it('CAMP-40 edits name, description and anonymous ranking while running, with start, weeks and minimum locked (CAMP-41)', async () => {
    const user = userEvent.setup();
    const { onSave } = renderSettings(challengeOf({ status: 'active', startDate: '2026-11-02', endDate: '2026-11-29' }));

    [nameInput(), descriptionInput(), anonymousSwitch()].forEach((field) => expect(field).toBeEnabled());
    [startSelect(), weeksSelect(), podiumSelect()].forEach((field) => expect(field).toBeDisabled());

    await user.type(nameInput(), '!');
    await user.click(anonymousSwitch());
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(onSave).toHaveBeenCalledWith({ name: 'Verão 2027!', anonymousRanking: true });
  });

  it.each(['completed', 'cancelled'])('CAMP-45 locks every field and action of a %s championship', (status) => {
    renderSettings(challengeOf({ status }));

    [nameInput(), descriptionInput(), startSelect(), weeksSelect(), podiumSelect(), anonymousSwitch()].forEach((field) => expect(field).toBeDisabled());
    expect(screen.queryByRole('button', { name: 'Salvar configuração' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar campeonato' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar campeonato' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir campeonato' })).not.toBeInTheDocument();
  });

  it('CAMP-42 ends a running championship early after confirming and shows when it closes', async () => {
    const user = userEvent.setup();
    const { onCloseEarly } = renderSettings(challengeOf({ status: 'active', startDate: '2026-11-02', endDate: '2026-11-29' }));
    expect(screen.queryByRole('button', { name: 'Excluir campeonato' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Encerrar campeonato' }));
    expect(dialog()).toHaveTextContent('A semana em andamento será a última.');
    await user.click(within(dialog()).getByRole('button', { name: 'Encerrar campeonato' }));

    expect(onCloseEarly).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Encerra no fechamento de 22/11, às 21h.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Encerrar campeonato' })).not.toBeInTheDocument();
  });

  it('CAMP-42 keeps showing the close of a championship already asked to end', () => {
    renderSettings(challengeOf({ status: 'active', startDate: '2026-11-02', endDate: '2026-11-22', closeRequestedAt: '2026-11-18T12:00:00Z' }));

    expect(screen.getByText('Encerra no fechamento de 22/11.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar campeonato' })).not.toBeInTheDocument();
  });

  it('CAMP-43 cancels after confirming, and CAMP-44 deletes a scheduled one after confirming', async () => {
    const user = userEvent.setup();
    const { onCancel, onDelete } = renderSettings();

    await user.click(screen.getByRole('button', { name: 'Cancelar campeonato' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Cancelar campeonato' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Excluir campeonato' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Excluir' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('CAMP-46 closes the dialog without calling the API', async () => {
    const user = userEvent.setup();
    const handlers = renderSettings(challengeOf({ status: 'active', startDate: '2026-11-02', endDate: '2026-11-29' }));

    for (const action of ['Encerrar campeonato', 'Cancelar campeonato']) {
      await user.click(screen.getByRole('button', { name: action }));
      await user.click(within(dialog()).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    }

    expect(handlers.onCloseEarly).not.toHaveBeenCalled();
    expect(handlers.onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Encerrar campeonato' })).toBeInTheDocument();
  });

  it('CAMP-46 closes the delete dialog without calling the API', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderSettings();

    await user.click(screen.getByRole('button', { name: 'Excluir campeonato' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('CAMP-59 leaves without asking when nothing changed', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('link', { name: 'Meus Alunos' }));
    expect(screen.getByText('Página de alunos')).toBeInTheDocument();
  });

  it('CAMP-59 asks before discarding unsaved changes', async () => {
    const user = userEvent.setup();
    const { onDirtyChange } = renderSettings();

    await user.type(nameInput(), ' edição');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('link', { name: 'Meus Alunos' }));
    expect(dialog()).toHaveTextContent('Há mudanças não salvas. Descartar e sair?');
    await user.click(within(dialog()).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(nameInput()).toHaveValue('Verão 2027 edição');

    await user.click(screen.getByRole('link', { name: 'Meus Alunos' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Descartar' }));
    expect(await screen.findByText('Página de alunos')).toBeInTheDocument();
  });

  it('CAMP-64 shows the save error and keeps the form filled', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue({ userMessage: 'O campeonato já começou.' });
    renderSettings(challengeOf(), { onSave });

    await user.type(descriptionInput(), ' e medalha');
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('O campeonato já começou.');
    expect(descriptionInput()).toHaveValue('Prêmio: camiseta e medalha');
  });

  it('CAMP-05 shows the error in the name field and does not save an empty name', async () => {
    const user = userEvent.setup();
    const { onSave } = renderSettings();

    await user.clear(nameInput());
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome do campeonato.');
    expect(nameInput()).toHaveClass('input--error');
    expect(onSave).not.toHaveBeenCalled();
  });
});
