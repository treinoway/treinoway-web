import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import CreateTemplateDialog from './CreateTemplateDialog';

const GENERAL_ID = 'tpl-general';
const TITLE = 'Criar modelo de feedback';
const NAME_LABEL = 'Nome do modelo';
const SOURCE_LABEL = 'Ponto de partida';
const FROM_GENERAL = 'Começar do Padrão TeuFit';
const BLANK = 'Em branco';
const NAME_LIMIT = 80;

// Renders the dialog with spies for both callbacks and returns them
const renderDialog = (props = {}) => {
  const onCreate = vi.fn();
  const onCancel = vi.fn();
  const view = render(<CreateTemplateDialog generalTemplateId={GENERAL_ID} onCreate={onCreate} onCancel={onCancel} {...props} />);
  return { ...view, onCreate, onCancel };
};

// Name input of the dialog
const nameInput = () => screen.getByRole('textbox', { name: NAME_LABEL });

// Tab of one starting point
const sourceTab = (name) => screen.getByRole('tab', { name });

describe('CreateTemplateDialog initial state', () => {
  it('opens as a primary confirm dialog titled after the action', () => {
    renderDialog();

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName(TITLE);
    expect(dialog).toHaveClass('ds-dialog');
    expect(within(dialog).getByRole('button', { name: 'Criar' })).toHaveClass('btn--primary');
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeEnabled();
  });

  it('starts with an empty focused name and the confirm button disabled', () => {
    renderDialog();

    expect(nameInput()).toHaveValue('');
    expect(nameInput()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled();
  });

  it('offers both starting points with the general template selected', () => {
    renderDialog();

    const tablist = screen.getByRole('tablist', { name: SOURCE_LABEL });
    expect(within(tablist).getAllByRole('tab')).toHaveLength(2);
    expect(sourceTab(FROM_GENERAL)).toHaveAttribute('aria-selected', 'true');
    expect(sourceTab(BLANK)).toHaveAttribute('aria-selected', 'false');
  });
});

describe('CreateTemplateDialog name', () => {
  it('shows what the trainer types and enables the confirm button', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(nameInput(), 'Avaliação mensal');

    expect(nameInput()).toHaveValue('Avaliação mensal');
    expect(screen.getByRole('button', { name: 'Criar' })).toBeEnabled();
  });

  it('caps the name at 80 characters', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog();
    expect(nameInput()).toHaveAttribute('maxLength', String(NAME_LIMIT));

    await user.click(nameInput());
    await user.paste('a'.repeat(NAME_LIMIT));
    await user.type(nameInput(), 'bcd');

    expect(nameInput()).toHaveValue('a'.repeat(NAME_LIMIT));
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(onCreate).toHaveBeenCalledWith({ name: 'a'.repeat(NAME_LIMIT), sourceTemplateId: GENERAL_ID });
  });

  it('keeps the confirm button disabled while the name is only whitespace', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(nameInput(), '   ');

    expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('disables the confirm button again when the name is cleared', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(nameInput(), 'Mensal');
    expect(screen.getByRole('button', { name: 'Criar' })).toBeEnabled();
    await user.clear(nameInput());

    expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled();
  });

  it('does not create when Enter is pressed on an empty name', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.click(nameInput());
    await user.keyboard('{Enter}');

    expect(onCreate).not.toHaveBeenCalled();
  });
});

describe('CreateTemplateDialog starting point', () => {
  it('switches to blank and back to the general template', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.click(sourceTab(BLANK));
    expect(sourceTab(BLANK)).toHaveAttribute('aria-selected', 'true');
    expect(sourceTab(FROM_GENERAL)).toHaveAttribute('aria-selected', 'false');

    await user.click(sourceTab(FROM_GENERAL));
    expect(sourceTab(FROM_GENERAL)).toHaveAttribute('aria-selected', 'true');
    expect(sourceTab(BLANK)).toHaveAttribute('aria-selected', 'false');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('keeps the typed name when the starting point changes', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(nameInput(), 'Mensal');
    await user.click(sourceTab(BLANK));

    expect(nameInput()).toHaveValue('Mensal');
  });
});

describe('CreateTemplateDialog confirm', () => {
  it('creates from the general template with the trimmed name', async () => {
    const user = userEvent.setup();
    const { onCreate, onCancel } = renderDialog();

    await user.type(nameInput(), '  Avaliação mensal  ');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({ name: 'Avaliação mensal', sourceTemplateId: GENERAL_ID });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('creates a blank template with no source and the trimmed name', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(nameInput(), '  Do zero ');
    await user.click(sourceTab(BLANK));
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({ name: 'Do zero', sourceTemplateId: undefined });
  });

  it('creates from the general template again after switching back to it', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(nameInput(), 'Mensal');
    await user.click(sourceTab(BLANK));
    await user.click(sourceTab(FROM_GENERAL));
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(onCreate).toHaveBeenCalledWith({ name: 'Mensal', sourceTemplateId: GENERAL_ID });
  });

  it('confirms with Enter in the name field', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog();

    await user.type(nameInput(), ' Mensal{Enter}');

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({ name: 'Mensal', sourceTemplateId: GENERAL_ID });
  });

  it('stays open after confirming, leaving the closing to its owner', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(nameInput(), 'Mensal');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(nameInput()).toHaveValue('Mensal');
  });
});

describe('CreateTemplateDialog cancel', () => {
  it('calls onCancel from the cancel button without creating', async () => {
    const user = userEvent.setup();
    const { onCreate, onCancel } = renderDialog();

    await user.type(nameInput(), 'Mensal');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const { onCreate, onCancel } = renderDialog();

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });
});

describe('CreateTemplateDialog busy', () => {
  it('disables every control and shows the creating label', () => {
    renderDialog({ busy: true });

    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-busy', 'true');
    expect(nameInput()).toBeDisabled();
    expect(sourceTab(FROM_GENERAL)).toBeDisabled();
    expect(sourceTab(BLANK)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Criando...' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Criar' })).not.toBeInTheDocument();
  });

  it('keeps the name and the choice when it becomes busy, and ignores confirm, cancel and Escape', async () => {
    const user = userEvent.setup();
    const { rerender, onCreate, onCancel } = renderDialog();
    await user.type(nameInput(), 'Mensal');
    await user.click(sourceTab(BLANK));

    rerender(<CreateTemplateDialog generalTemplateId={GENERAL_ID} busy onCreate={onCreate} onCancel={onCancel} />);

    expect(nameInput()).toHaveValue('Mensal');
    expect(sourceTab(BLANK)).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'Criando...' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.keyboard('{Escape}');
    expect(onCreate).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('becomes usable again when the request ends', async () => {
    const user = userEvent.setup();
    const { rerender, onCreate, onCancel } = renderDialog({ busy: true });

    rerender(<CreateTemplateDialog generalTemplateId={GENERAL_ID} busy={false} onCreate={onCreate} onCancel={onCancel} />);
    await user.type(nameInput(), 'Mensal');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(onCreate).toHaveBeenCalledWith({ name: 'Mensal', sourceTemplateId: GENERAL_ID });
  });

  it('gives the focus back to the name when the request ends, so Escape still cancels', async () => {
    const user = userEvent.setup();
    const { rerender, onCreate, onCancel } = renderDialog();
    await user.type(nameInput(), 'Mensal');
    // why: a browser takes the focus away from a field that becomes disabled; jsdom leaves it there (and ignores blur on a disabled field), which would hide a missing refocus.
    nameInput().blur();

    rerender(<CreateTemplateDialog generalTemplateId={GENERAL_ID} busy onCreate={onCreate} onCancel={onCancel} />);
    expect(nameInput()).toBeDisabled();
    expect(document.body).toHaveFocus();
    rerender(<CreateTemplateDialog generalTemplateId={GENERAL_ID} busy={false} onCreate={onCreate} onCancel={onCancel} />);

    expect(nameInput()).toBeEnabled();
    expect(nameInput()).toHaveFocus();
    expect(nameInput()).toHaveValue('Mensal');
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });
});

describe('CreateTemplateDialog without a general template', () => {
  it('hides the starting point choice', () => {
    renderDialog({ generalTemplateId: undefined });

    expect(nameInput()).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByText(SOURCE_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(FROM_GENERAL)).not.toBeInTheDocument();
    expect(screen.queryByText(BLANK)).not.toBeInTheDocument();
  });

  it('creates a blank template with the trimmed name', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog({ generalTemplateId: undefined });

    await user.type(nameInput(), ' Do zero ');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({ name: 'Do zero', sourceTemplateId: undefined });
  });

  it('still requires a name', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderDialog({ generalTemplateId: undefined });

    expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled();
    await user.type(nameInput(), '  {Enter}');

    expect(onCreate).not.toHaveBeenCalled();
  });
});
