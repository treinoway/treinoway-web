import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import TemplateQuestionPreview from './TemplateQuestionPreview';

// Draft question as the builder keeps it; overrides replace any field
const draftQuestion = (overrides = {}) => ({
  key: 'q-1',
  text: 'Como foi sua adesão ao treino?',
  helpText: 'Considere os últimos 7 dias.',
  type: 'score',
  pillar: 'training_adherence',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: 'Não treinei',
  maxLabel: 'Treinei tudo',
  ...overrides,
});

// Renders the preview of a question and returns the phone frame the student screen is drawn in
const renderPreview = (overrides = {}) => {
  const view = render(<TemplateQuestionPreview question={draftQuestion(overrides)} />);
  return { ...view, frame: screen.getByRole('group', { name: 'Tela do app do aluno' }) };
};

describe('TemplateQuestionPreview', () => {
  it('is a region titled "Como o aluno vê" with the question inside a phone frame', () => {
    const { frame } = renderPreview();

    const region = screen.getByRole('region', { name: 'Como o aluno vê' });
    expect(within(region).getByRole('heading', { level: 2, name: 'Como o aluno vê' })).toBeInTheDocument();
    expect(region).toContainElement(frame);
    expect(frame).toHaveClass('phone-frame');
    expect(within(frame).getByText('Como foi sua adesão ao treino?')).toBeInTheDocument();
    expect(within(frame).getByText('Considere os últimos 7 dias.')).toBeInTheDocument();
  });

  it('shows "Pergunta sem texto" while the question has no text', () => {
    const { frame } = renderPreview({ text: '' });

    expect(within(frame).getByText('Pergunta sem texto')).toBeInTheDocument();
  });

  it('shows no help text line when the question has none', () => {
    const { frame } = renderPreview({ helpText: '' });

    expect(within(frame).queryByText('Considere os últimos 7 dias.')).not.toBeInTheDocument();
    expect(frame.querySelectorAll('p')).toHaveLength(1);
  });

  it('shows a score question as the scale from 0 to 10 with what each end means', () => {
    const { frame, container } = renderPreview();

    expect(container.querySelector('.score-scale')).toBeInTheDocument();
    expect(within(frame).getAllByRole('listitem').map((cell) => cell.textContent)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(within(frame).getByText('Não treinei')).toBeInTheDocument();
    expect(within(frame).getByText('Treinei tudo')).toBeInTheDocument();
    expect(within(frame).queryByRole('img')).not.toBeInTheDocument();
    expect(within(frame).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the scale with only the end label that was filled', () => {
    const { frame } = renderPreview({ minLabel: '', maxLabel: 'Treinei tudo' });

    expect(within(frame).getAllByRole('listitem')).toHaveLength(11);
    expect(within(frame).getByText('Treinei tudo')).toBeInTheDocument();
    expect(within(frame).queryByText('Não treinei')).not.toBeInTheDocument();
  });

  it('shows the scale alone when no end label was filled', () => {
    const { frame } = renderPreview({ helpText: '', minLabel: '', maxLabel: '' });

    expect(within(frame).getAllByRole('listitem')).toHaveLength(11);
    expect(frame).toHaveTextContent('Como foi sua adesão ao treino?012345678910', { normalizeWhitespace: true });
  });

  it('shows a stars question as five stars, with no scale and no end labels', () => {
    const { frame, container } = renderPreview({ type: 'stars' });

    expect(within(frame).getByRole('img', { name: '5 estrelas' })).toHaveClass('star-rating');
    expect(container.querySelector('.score-scale')).not.toBeInTheDocument();
    expect(within(frame).queryByText('Não treinei')).not.toBeInTheDocument();
    expect(within(frame).queryByText('Treinei tudo')).not.toBeInTheDocument();
    expect(within(frame).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows an open question as a disabled text area the student would write in', () => {
    const { frame, container } = renderPreview({ type: 'open' });

    const answer = within(frame).getByRole('textbox', { name: 'Resposta do aluno' });
    expect(answer).toBeDisabled();
    expect(answer).toHaveAttribute('placeholder', 'O aluno escreve aqui');
    expect(container.querySelector('.score-scale')).not.toBeInTheDocument();
    expect(within(frame).queryByRole('img')).not.toBeInTheDocument();
    expect(within(frame).queryByText('Não treinei')).not.toBeInTheDocument();
  });

  it('follows the question it is given', () => {
    const { frame, rerender } = renderPreview();

    rerender(<TemplateQuestionPreview question={draftQuestion({ text: 'Como você dormiu?', helpText: '', type: 'stars' })} />);

    expect(within(frame).getByText('Como você dormiu?')).toBeInTheDocument();
    expect(within(frame).queryByText('Como foi sua adesão ao treino?')).not.toBeInTheDocument();
    expect(within(frame).getByRole('img', { name: '5 estrelas' })).toBeInTheDocument();
  });
});
