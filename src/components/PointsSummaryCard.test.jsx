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
  it('renders title and default subtitle when values match template', () => {
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Regras de pontuação')).toBeInTheDocument();
    expect(screen.getByText('Usando preferências padrão')).toBeInTheDocument();
  });

  it('shows customized subtitle with diff count', () => {
    const modified = { ...baseValues, ptsWorkoutCompleted: 99, ptsStreak7Days: 999 };
    renderWithRouter(
      <PointsSummaryCard
        values={modified}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Personalizado (2 alterações)')).toBeInTheDocument();
  });

  it('shows Editar button when editable', () => {
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('shows Ver detalhes button when not editable', () => {
    renderWithRouter(
      <PointsSummaryCard
        values={baseValues}
        template={template}
        editable={false}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Ver detalhes' })).toBeInTheDocument();
  });

  it('calls onAction when button is clicked', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('shows diff dot when any value differs', () => {
    const modified = { ...baseValues, ptsWorkoutCompleted: 99 };
    renderWithRouter(
      <PointsSummaryCard
        values={modified}
        template={template}
        editable
        onAction={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Valores personalizados')).toBeInTheDocument();
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
    expect(screen.getByText('Personalizado (1 alterações)')).toBeInTheDocument();
  });
});
