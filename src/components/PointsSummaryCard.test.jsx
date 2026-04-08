import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import PointsSummaryCard from './PointsSummaryCard';

const baseValues = {
  ptsWorkoutCompleted: 10,
  ptsStreak7Days: 50,
  ptsStreak30Days: 250,
  ptsDailyCheckin: 2,
  ptsEvolutionRecord: 15,
  ptsWorkoutFeedback: 5,
  dailyPointsCap: null,
};

const template = { ...baseValues };

describe('PointsSummaryCard', () => {
  it('renders title "Pontuação"', () => {
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Pontuação')).toBeInTheDocument();
  });

  it('renders point value chips for the first 3 fields', () => {
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Treino')).toBeInTheDocument();
    expect(screen.getByText('10 pts')).toBeInTheDocument();
    expect(screen.getByText('Seq. 7d')).toBeInTheDocument();
    expect(screen.getByText('50 pts')).toBeInTheDocument();
    expect(screen.getByText('Seq. 30d')).toBeInTheDocument();
    expect(screen.getByText('250 pts')).toBeInTheDocument();
  });

  it('shows "--" for null/undefined chip values', () => {
    const nullValues = { ...baseValues, ptsWorkoutCompleted: null };
    renderWithRouter(
      <PointsSummaryCard
        values={nullValues}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Treino')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows "+N regras" chip for remaining fields', () => {
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText(/\+\d+ regras/)).toBeInTheDocument();
  });

  it('shows "Personalizado" badge when values differ from template and showDiff is true', () => {
    const modified = { ...baseValues, ptsWorkoutCompleted: 99 };
    renderWithRouter(
      <PointsSummaryCard
        values={modified}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
  });

  it('does not show "Personalizado" badge when values match template', () => {
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByText('Personalizado')).not.toBeInTheDocument();
  });

  it('does not show "Personalizado" badge when showDiff is false', () => {
    const modified = { ...baseValues, ptsWorkoutCompleted: 99 };
    renderWithRouter(
      <PointsSummaryCard
        values={modified}
        template={template}
        showDiff={false}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByText('Personalizado')).not.toBeInTheDocument();
  });

  it('calls onAction when card is clicked and editable', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={onAction}
      />
    );
    await user.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalled();
  });

  it('calls onAction when Enter key is pressed and editable', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={onAction}
      />
    );
    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalled();
  });

  it('calls onAction when Space key is pressed and editable', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={onAction}
      />
    );
    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard(' ');
    expect(onAction).toHaveBeenCalled();
  });

  it('does not render a role="button" when not editable', () => {
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable={false}
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows ChevronRight icon only when editable', () => {
    const { rerender } = renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);

    rerender(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable={false}
        onAction={vi.fn()}
      />
    );
    expect(document.querySelectorAll('svg').length).toBe(0);
  });

  it('counts anonymousRanking as a diff when different from template', () => {
    const modified = { ...baseValues, anonymousRanking: true };
    const tmpl = { ...template, anonymousRanking: false };
    renderWithRouter(
      <PointsSummaryCard
        values={modified}
        template={tmpl}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
  });
});
