import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import HistoryEmptyState from './HistoryEmptyState';

const DS = { EmptyBlock: 'empty-block' };

const EMPTY_TITLE = 'Nenhum feedback enviado ainda.';
const EMPTY_INVITE = 'Envie um agora ou ative o envio automático para ouvir Ana automaticamente.';
const EMPTY_NOTHING_SCHEDULED = 'O envio automático está ativo, mas não há envio previsto para Ana. Envie um agora.';
const SCHEDULED_TITLE = 'O primeiro feedback sai em 01/12.';
const SCHEDULED_DESCRIPTION = 'Ana recebe o de 7 dias automaticamente. Se quiser ouvir antes, envie um agora.';

// why: the due instant is built in local time so the day shown does not depend on the timezone of the machine
const NEXT_D7 = { milestone: 'D7', milestoneLabel: 'D7', dueAt: new Date(2026, 11, 1, 9, 0).toISOString() };

// Renders the empty state of a student called Ana; overrides replace any prop
const renderEmpty = (props = {}) => render(<HistoryEmptyState studentName="Ana" studentNameInSentence="Ana" {...props} />);

describe('HistoryEmptyState: automatic sending off', () => {
  it('says nothing was sent yet and invites to send one or turn the automatic sending on', () => {
    const { container } = renderEmpty();

    expect(screen.getByRole('heading', { name: EMPTY_TITLE })).toBeInTheDocument();
    expect(screen.getByText(EMPTY_INVITE)).toBeInTheDocument();
    expect(container.querySelector(`.${DS.EmptyBlock}`)).toHaveTextContent(EMPTY_INVITE);
  });

  it('shows the same invite when `autoSendEnabled` is false and `next` is null', () => {
    renderEmpty({ autoSendEnabled: false, next: null });

    expect(screen.getByRole('heading', { name: EMPTY_TITLE })).toBeInTheDocument();
    expect(screen.getByText(EMPTY_INVITE)).toBeInTheDocument();
    expect(screen.queryByText(/^O primeiro feedback sai em/)).not.toBeInTheDocument();
  });

  it('promises no fixed milestone days, since the trainer chooses them', () => {
    const { container } = renderEmpty();

    expect(container).not.toHaveTextContent(/7, 15, 21 e 30 dias/);
    expect(container).not.toHaveTextContent(/não há envio previsto/);
  });

  it('calls a student without a name "o aluno", in lower case inside the sentence', () => {
    renderEmpty({ studentName: 'O aluno', studentNameInSentence: 'o aluno' });

    expect(screen.getByText('Envie um agora ou ative o envio automático para ouvir o aluno automaticamente.')).toBeInTheDocument();
    expect(screen.queryByText(/O aluno/)).not.toBeInTheDocument();
  });

  it('has no action button', () => {
    renderEmpty();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('HistoryEmptyState: automatic sending on with nothing scheduled', () => {
  it('says nothing was sent yet and that the sending is active with no send foreseen, in an EmptyBlock', () => {
    const { container } = renderEmpty({ autoSendEnabled: true, next: null });

    expect(screen.getByRole('heading', { name: EMPTY_TITLE })).toBeInTheDocument();
    expect(screen.getByText(EMPTY_NOTHING_SCHEDULED)).toBeInTheDocument();
    expect(container.querySelector(`.${DS.EmptyBlock}`)).toHaveTextContent(EMPTY_NOTHING_SCHEDULED);
  });

  it('shows the same text when `next` is not passed', () => {
    renderEmpty({ autoSendEnabled: true });

    expect(screen.getByRole('heading', { name: EMPTY_TITLE })).toBeInTheDocument();
    expect(screen.getByText(EMPTY_NOTHING_SCHEDULED)).toBeInTheDocument();
  });

  it('does not invite to turn on a sending that is already on, nor announces a first feedback', () => {
    const { container } = renderEmpty({ autoSendEnabled: true, next: null });

    expect(screen.getByText(EMPTY_NOTHING_SCHEDULED)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/ative o envio automático/i);
    expect(container).not.toHaveTextContent(/O primeiro feedback sai em/);
    expect(container).not.toHaveTextContent(/7, 15, 21 e 30 dias/);
  });

  it('calls a student without a name "o aluno", in lower case inside the sentence', () => {
    renderEmpty({ autoSendEnabled: true, next: null, studentName: 'O aluno', studentNameInSentence: 'o aluno' });

    expect(screen.getByText('O envio automático está ativo, mas não há envio previsto para o aluno. Envie um agora.')).toBeInTheDocument();
    expect(screen.queryByText(/O aluno/)).not.toBeInTheDocument();
  });

  it('has no action button', () => {
    renderEmpty();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('HistoryEmptyState: first automatic send scheduled', () => {
  it('says when the first feedback goes out and which milestone it is, with the web label', () => {
    const { container } = renderEmpty({ autoSendEnabled: true, next: NEXT_D7 });

    expect(screen.getByRole('heading', { name: SCHEDULED_TITLE })).toBeInTheDocument();
    expect(screen.getByText(SCHEDULED_DESCRIPTION)).toBeInTheDocument();
    expect(container.querySelector(`.${DS.EmptyBlock}`)).toHaveTextContent(SCHEDULED_DESCRIPTION);
  });

  it('does not show the invite to turn the automatic sending on, nor that nothing is foreseen', () => {
    const { container } = renderEmpty({ autoSendEnabled: true, next: NEXT_D7 });

    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_INVITE)).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/ative o envio automático|não há envio previsto/);
  });

  it('names a milestone the app does not know with the label the service sent', () => {
    renderEmpty({ next: { ...NEXT_D7, milestone: 'D45', milestoneLabel: '45 dias' } });

    expect(screen.getByText('Ana recebe o de 45 dias automaticamente. Se quiser ouvir antes, envie um agora.')).toBeInTheDocument();
  });

  it('opens the description with "O aluno" for a student without a name', () => {
    renderEmpty({ next: NEXT_D7, studentName: 'O aluno', studentNameInSentence: 'o aluno' });

    expect(screen.getByText('O aluno recebe o de 7 dias automaticamente. Se quiser ouvir antes, envie um agora.')).toBeInTheDocument();
  });

  it('never shows "Invalid Date" when the service sent no due date', () => {
    const { container } = renderEmpty({ next: { ...NEXT_D7, dueAt: null } });

    expect(container).not.toHaveTextContent(/Invalid Date|null|undefined/);
    expect(screen.getByText(SCHEDULED_DESCRIPTION)).toBeInTheDocument();
  });

  it('has no action button', () => {
    renderEmpty({ next: NEXT_D7 });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
