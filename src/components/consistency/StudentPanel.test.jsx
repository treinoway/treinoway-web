import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from '../../api/axios';
import StudentPanel from './StudentPanel';

const BASE_URL = '/trainer/consistency-ranking';
const STUDENT_ID = 'student-1';

// Panel payload of the service for João V., at risk after two weeks below 70%
const buildPanel = (overrides = {}) => ({
  studentId: STUDENT_ID,
  firstName: 'João',
  whatsapp: '+55 (11) 99999-8888',
  displayName: 'João V.',
  initials: 'JV',
  position: 17,
  total: 18,
  average: 61,
  faixa: 'restarting',
  risk: { weeks: 2, scores: [64, 58] },
  currentTargets: [
    { pillar: 'workouts', expected: 4, adjusted: null },
    { pillar: 'cardio', expected: 3, adjusted: 1 },
  ],
  pause: null,
  signals: [],
  seasonPillars: [
    { pillar: 'workouts', done: 5, expected: 8, adherence: 62.5 },
    { pillar: 'cardio', done: 1, expected: 4, adherence: 25 },
  ],
  weakestPillar: 'cardio',
  riskLimit: 70,
  weeks: [
    { weekStart: '2026-10-19', number: 1, state: 'closed', status: 'valid', score: 64 },
    { weekStart: '2026-10-26', number: 2, state: 'closed', status: 'valid', score: 58 },
    { weekStart: '2026-11-02', number: 3, state: 'current', status: 'valid', score: 21 },
    { weekStart: '2026-11-09', number: 4, state: 'future', status: null, score: null },
  ],
  previousSeasons: [
    { number: 2, startWeek: '2026-09-21', endWeek: '2026-10-12', average: 72, faixa: 'steady' },
    { number: 1, startWeek: '2026-08-24', endWeek: '2026-09-14', average: 79, faixa: 'steady' },
  ],
  lastContact: null,
  ...overrides,
});

// Makes window.matchMedia report the same answer for every query
const mockMatchMedia = (matches) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
};

// Renders the panel and waits for the payload to load
const renderPanel = async (props = {}) => {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  render(<StudentPanel studentId={STUDENT_ID} studentName="João V." seasonNumber={3} closeLabel="domingo às 21h" onClose={onClose} onChanged={onChanged} {...props} />);
  await screen.findByRole('button', { name: 'Abrir no WhatsApp' });
  return { onClose, onChanged };
};

describe('StudentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(true);
    api.get.mockResolvedValue({ data: buildPanel() });
    api.post.mockResolvedValue({ data: {} });
    api.put.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
    vi.spyOn(window, 'open').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the panel of the student and shows name, position, average and band', async () => {
    await renderPanel();

    expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/students/${STUDENT_ID}`);
    expect(screen.getByRole('dialog', { name: 'João V.' })).toBeInTheDocument();
    expect(screen.getByText('17º de 18 · 61% na temporada')).toBeInTheDocument();
    expect(screen.getByText('Retomando')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Semana 3 em andamento: 21%' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Cardio' })).toBeInTheDocument();
    expect(screen.getByText('Mensagem pronta · pilar mais fraco: Cardio')).toBeInTheDocument();
  });

  it('shows the loading state while the panel loads', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<StudentPanel studentId={STUDENT_ID} studentName="João V." seasonNumber={3} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'João V.' })).toBeInTheDocument();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir no WhatsApp' })).not.toBeInTheDocument();
  });

  it('shows the API error and loads again on "Tentar de novo"', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce(Object.assign(new Error('falha'), { userMessage: 'Não foi possível carregar o aluno.' }));
    render(<StudentPanel studentId={STUDENT_ID} studentName="João V." seasonNumber={3} onClose={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o aluno.');
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('button', { name: 'Abrir no WhatsApp' })).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar o aluno.')).not.toBeInTheDocument();
  });

  it('PAN-19 draws the avatar of a student at risk in the risk tint', async () => {
    await renderPanel();

    const avatar = screen.getByText('JV').closest('.student-panel__avatar');

    expect(avatar).toHaveClass('student-panel__avatar--risk');
  });

  it('PAN-20 shows the risk alert with the scores of the weeks that caused it', async () => {
    await renderPanel();
    expect(screen.getByRole('alert')).toHaveTextContent('Abaixo de 70% há 2 semanas seguidas: 64% e 58%.');
  });

  it('PAN-20 uses the singular for one week and the trainer limit', async () => {
    api.get.mockResolvedValue({ data: buildPanel({ risk: { weeks: 1, scores: [64] }, riskLimit: 80 }) });
    await renderPanel();
    expect(screen.getByRole('alert')).toHaveTextContent('Abaixo de 80% há 1 semana seguida: 64%.');
  });

  it('PAN-20 shows no alert for a student who is not at risk', async () => {
    api.get.mockResolvedValue({ data: buildPanel({ risk: null, faixa: 'steady', average: 75 }) });
    await renderPanel();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('PAN-26 shows previous seasons and last contact', async () => {
    api.get.mockResolvedValue({ data: buildPanel({ lastContact: '2026-11-05T15:00:00.000Z' }) });
    await renderPanel();

    expect(screen.getByText('Temporada 2: 72% · Em ritmo')).toBeInTheDocument();
    expect(screen.getByText('Temporada 1: 79% · Em ritmo')).toBeInTheDocument();
    expect(screen.getByText('Último contato: 05/11/2026')).toBeInTheDocument();
  });

  it('PAN-26 shows a dash when there was no contact', async () => {
    await renderPanel();
    expect(screen.getByText('Último contato: —')).toBeInTheDocument();
  });

  it('PAN-28 opens full screen below 768px and as a side panel from 768px', async () => {
    mockMatchMedia(false);
    const { unmount } = render(<StudentPanel studentId={STUDENT_ID} studentName="João V." seasonNumber={3} onClose={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: 'João V.' })).toHaveAttribute('data-layout', 'fullscreen');
    unmount();

    mockMatchMedia(true);
    render(<StudentPanel studentId={STUDENT_ID} studentName="João V." seasonNumber={3} onClose={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: 'João V.' })).toHaveAttribute('data-layout', 'side');
    expect(screen.getByRole('dialog', { name: 'João V.' }).parentElement).toHaveClass('ds-drawer-overlay--wide');
  });

  it('PAN-35 shows the pause and adjust note with the actions of the current week', async () => {
    await renderPanel();

    expect(screen.getByText('Ações na semana atual')).toBeInTheDocument();
    expect(screen.getByText('Pausar deixa a semana neutra: não entra na média e não quebra a sequência. Ajustar a meta vale só para esta semana.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pausar semana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajustar meta' })).toBeInTheDocument();
  });

  it('PAN-29 pauses the current week of the student from the panel and tells the page', async () => {
    const user = userEvent.setup();
    const { onChanged } = await renderPanel();

    await user.click(screen.getByRole('button', { name: 'Pausar semana' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pausar semana' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Motivo (opcional)' }), 'viagem');
    await user.click(within(dialog).getByRole('button', { name: 'Pausar semana' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/pauses`, { weekStart: '2026-11-02', studentId: STUDENT_ID, reason: 'viagem' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Pausar semana' })).not.toBeInTheDocument());
  });

  it('PAN-32 shows the paused week and resumes it', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildPanel({ pause: { weekStart: '2026-11-02', reason: 'viagem' } }) });
    const { onChanged } = await renderPanel();

    expect(screen.getByText('Semana pausada (viagem)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pausar semana' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desfazer pausa' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`${BASE_URL}/pauses`, { data: { weekStart: '2026-11-02', studentId: STUDENT_ID } }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('PAN-33 adjusts the target of the current week from the panel', async () => {
    const user = userEvent.setup();
    const { onChanged } = await renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajustar meta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ajustar meta' });
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Nova meta' }), '2');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/students/${STUDENT_ID}/targets`, { pillar: 'workouts', value: 2 }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('PAN-33 shows the frozen target of the week for the chosen pillar in the adjustment modal', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajustar meta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ajustar meta' });

    expect(within(dialog).getByText('Meta da semana: 4')).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Pilar' }), 'cardio');
    expect(within(dialog).getByText('Meta da semana: 3')).toBeInTheDocument();
  });

  it('PAN-34 keeps the adjustment modal open with the API message when the target is refused', async () => {
    const user = userEvent.setup();
    api.put.mockRejectedValue(Object.assign(new Error('conflito'), { userMessage: 'A meta só pode ser reduzida na semana em andamento, de zero até a meta original.' }));
    await renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajustar meta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ajustar meta' });
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Nova meta' }), '9');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('A meta só pode ser reduzida na semana em andamento, de zero até a meta original.');
  });

  it('PAN-25 opens WhatsApp from the panel and logs the contact', async () => {
    const user = userEvent.setup();
    const { onChanged } = await renderPanel();

    await user.click(screen.getByRole('button', { name: 'Abrir no WhatsApp' }));

    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/5511999998888?text='), '_blank', 'noopener,noreferrer');
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/students/${STUDENT_ID}/contacts`, { pillar: 'cardio' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('CPD-71 draws the week actions, the message edit and the modal cancels as DS neutral buttons (AD-062)', async () => {
    const user = userEvent.setup();
    await renderPanel();

    ['Pausar semana', 'Ajustar meta', 'Editar'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveClass('btn', 'btn--neutral');
      expect(screen.getByRole('button', { name })).not.toHaveClass('btn--secondary');
    });

    await user.click(screen.getByRole('button', { name: 'Pausar semana' }));
    const pauseDialog = await screen.findByRole('dialog', { name: 'Pausar semana' });
    expect(within(pauseDialog).getByRole('button', { name: 'Cancelar' })).toHaveClass('btn', 'btn--neutral');
    await user.click(within(pauseDialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Pausar semana' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Ajustar meta' }));
    const adjustDialog = await screen.findByRole('dialog', { name: 'Ajustar meta' });
    expect(within(adjustDialog).getByRole('button', { name: 'Cancelar' })).toHaveClass('btn', 'btn--neutral');
  });

  it('CPD-71 draws "Desfazer pausa" as the DS neutral button (AD-062)', async () => {
    api.get.mockResolvedValue({ data: buildPanel({ pause: { weekStart: '2026-11-02', reason: 'viagem' } }) });
    await renderPanel();
    expect(screen.getByRole('button', { name: 'Desfazer pausa' })).toHaveClass('btn', 'btn--neutral');
  });

  it('CPD-71 draws the retry of a failed panel load as the DS neutral button (AD-062)', async () => {
    api.get.mockRejectedValueOnce(Object.assign(new Error('falha'), { userMessage: 'Não foi possível carregar o aluno.' }));
    render(<StudentPanel studentId={STUDENT_ID} studentName="João V." seasonNumber={3} onClose={vi.fn()} />);

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toHaveClass('btn', 'btn--neutral');
  });

  it('PAN-27 closes with the close button and with Esc', async () => {
    const user = userEvent.setup();
    const { onClose } = await renderPanel();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
