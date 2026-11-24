import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import TemplateQuestionEditor from './TemplateQuestionEditor';

const TEXT_FIELD = { name: 'Pergunta' };
const HELP_FIELD = { name: 'Texto de apoio (opcional)' };
const MIN_FIELD = { name: 'O que significa 0' };
const MAX_FIELD = { name: 'O que significa 10' };
const PILLAR_FIELD = { name: 'Pilar' };
const REQUIRED = { name: 'Obrigatória' };
const INVERT = { name: 'Nota alta é ruim' };
const REMOVE = { name: 'Remover pergunta' };
const PILLAR_LABELS = ['Adesão (treino)', 'Adesão (plano alimentar)', 'Evolução', 'Rotina', 'Sono', 'Hidratação', 'Relato', 'Outro'];

// Draft question as the builder keeps it; overrides replace any field
const draftQuestion = (overrides = {}) => ({
  key: 'q-1',
  text: 'Como foi o treino',
  helpText: 'Últimos 7 dias',
  type: 'score',
  pillar: 'training_adherence',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: 'Ruim',
  maxLabel: 'Ótimo',
  ...overrides,
});

// Renders the editor of a question; extra props replace the defaults and the handlers are returned for assertions
const renderEditor = (questionOverrides = {}, props = {}) => {
  const handlers = { onChange: vi.fn(), onRemove: vi.fn() };
  render(<TemplateQuestionEditor question={draftQuestion(questionOverrides)} position={2} canRemove {...handlers} {...props} />);
  return handlers;
};

describe('TemplateQuestionEditor', () => {
  describe('fields', () => {
    it('is titled with the position of the question', () => {
      renderEditor();

      expect(screen.getByRole('heading', { level: 2, name: 'Pergunta 2' })).toBeInTheDocument();
    });

    it('shows the values of a score question in every field', () => {
      renderEditor();

      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue('Como foi o treino');
      expect(screen.getByRole('textbox', HELP_FIELD)).toHaveValue('Últimos 7 dias');
      expect(screen.getByRole('textbox', MIN_FIELD)).toHaveValue('Ruim');
      expect(screen.getByRole('textbox', MAX_FIELD)).toHaveValue('Ótimo');
      expect(screen.getByRole('combobox', PILLAR_FIELD)).toHaveValue('training_adherence');
      expect(within(screen.getByRole('group', { name: 'Tipo de resposta' })).getByRole('button', { name: 'Nota' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(screen.getByRole('group', { name: 'Quando mostrar' })).getByRole('button', { name: 'Sempre' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('switch', REQUIRED)).toBeChecked();
      expect(screen.getByRole('switch', INVERT)).not.toBeChecked();
    });

    it('limits each text to the length the service accepts', () => {
      renderEditor();

      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveAttribute('maxlength', '300');
      expect(screen.getByRole('textbox', HELP_FIELD)).toHaveAttribute('maxlength', '300');
      expect(screen.getByRole('textbox', MIN_FIELD)).toHaveAttribute('maxlength', '60');
      expect(screen.getByRole('textbox', MAX_FIELD)).toHaveAttribute('maxlength', '60');
    });

    it('offers the eight pillars in order and explains what the pillar is for', () => {
      renderEditor();
      const pillar = screen.getByRole('combobox', PILLAR_FIELD);

      expect(within(pillar).getAllByRole('option').map((option) => option.textContent)).toEqual(PILLAR_LABELS);
      expect(pillar).toHaveAccessibleDescription('As notas das perguntas do mesmo pilar entram juntas no índice do aluno.');
    });

    it('shows the meal plan condition as the pressed chip', () => {
      renderEditor({ condition: 'has_meal_plan' });
      const group = screen.getByRole('group', { name: 'Quando mostrar' });

      expect(within(group).getByRole('button', { name: 'Só se o aluno tem plano alimentar' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(group).getByRole('button', { name: 'Sempre' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows no end labels for a stars question and keeps "Nota alta é ruim"', () => {
      renderEditor({ type: 'stars', invertScore: true });

      expect(screen.queryByRole('textbox', MIN_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', MAX_FIELD)).not.toBeInTheDocument();
      expect(screen.getByRole('switch', INVERT)).toBeChecked();
    });

    it('shows neither end labels nor "Nota alta é ruim" for an open question, and keeps "Obrigatória"', () => {
      renderEditor({ type: 'open' });

      expect(screen.queryByRole('textbox', MIN_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', MAX_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('switch', INVERT)).not.toBeInTheDocument();
      expect(screen.getByRole('switch', REQUIRED)).toBeInTheDocument();
    });
  });

  describe('changes', () => {
    it.each([
      ['the question text', TEXT_FIELD, { text: 'Como foi o treino?' }],
      ['the help text', HELP_FIELD, { helpText: 'Últimos 7 dias?' }],
      ['the meaning of 0', MIN_FIELD, { minLabel: 'Ruim?' }],
      ['the meaning of 10', MAX_FIELD, { maxLabel: 'Ótimo?' }],
    ])('reports only %s when it is typed in', async (_, field, change) => {
      const user = userEvent.setup();
      const { onChange } = renderEditor();

      await user.type(screen.getByRole('textbox', field), '?');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(change);
    });

    it('reports the chosen answer type', async () => {
      const user = userEvent.setup();
      const { onChange } = renderEditor();

      await user.click(screen.getByRole('button', { name: 'Aberta' }));

      expect(onChange).toHaveBeenCalledWith({ type: 'open' });
    });

    it('reports the chosen pillar', async () => {
      const user = userEvent.setup();
      const { onChange } = renderEditor();

      await user.selectOptions(screen.getByRole('combobox', PILLAR_FIELD), 'Sono');

      expect(onChange).toHaveBeenCalledWith({ pillar: 'sleep' });
    });

    it('reports the meal plan condition, and null for "Sempre"', async () => {
      const user = userEvent.setup();
      const { onChange } = renderEditor();

      await user.click(screen.getByRole('button', { name: 'Só se o aluno tem plano alimentar' }));
      await user.click(screen.getByRole('button', { name: 'Sempre' }));

      expect(onChange.mock.calls).toEqual([[{ condition: 'has_meal_plan' }], [{ condition: null }]]);
    });

    it('reports "Obrigatória" switched off', async () => {
      const user = userEvent.setup();
      const { onChange } = renderEditor({ required: true });

      await user.click(screen.getByRole('switch', REQUIRED));

      expect(onChange).toHaveBeenCalledWith({ required: false });
    });

    it('reports "Nota alta é ruim" switched on', async () => {
      const user = userEvent.setup();
      const { onChange } = renderEditor({ invertScore: false });

      await user.click(screen.getByRole('switch', INVERT));

      expect(onChange).toHaveBeenCalledWith({ invertScore: true });
    });

    it('never asks to remove the question while it is being edited', async () => {
      const user = userEvent.setup();
      const { onRemove } = renderEditor();

      await user.type(screen.getByRole('textbox', TEXT_FIELD), '?');
      await user.click(screen.getByRole('switch', REQUIRED));

      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('removal', () => {
    it('calls onRemove from "Remover pergunta" when the question can be removed', async () => {
      const user = userEvent.setup();
      const { onRemove, onChange } = renderEditor({}, { canRemove: true });
      const remove = screen.getByRole('button', REMOVE);

      expect(remove).toBeEnabled();
      expect(remove).not.toHaveAttribute('title');
      await user.click(remove);

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('disables "Remover pergunta" on the last remaining question and says why', async () => {
      const user = userEvent.setup();
      const { onRemove } = renderEditor({}, { canRemove: false });
      const remove = screen.getByRole('button', REMOVE);

      expect(remove).toBeDisabled();
      expect(remove).toHaveAttribute('title', 'O modelo precisa ter pelo menos uma pergunta.');
      await user.click(remove);

      expect(onRemove).not.toHaveBeenCalled();
    });
  });
});
