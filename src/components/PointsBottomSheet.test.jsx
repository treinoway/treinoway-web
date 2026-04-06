import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import PointsBottomSheet from './PointsBottomSheet';

const defaultValues = {
  ptsWorkoutCompleted: 10,
  ptsStreak7Days: 50,
  ptsStreak30Days: 250,
  ptsDailyCheckin: 2,
  ptsEvolutionRecord: 15,
  ptsWorkoutFeedback: 5,
  dailyPointsCap: null,
};

const templateValues = {
  ptsWorkoutCompleted: 10,
  ptsStreak7Days: 50,
  ptsStreak30Days: 250,
  ptsDailyCheckin: 2,
  ptsEvolutionRecord: 15,
  ptsWorkoutFeedback: 5,
  dailyPointsCap: null,
};

describe('PointsBottomSheet', () => {
  it('renders all field labels in editable mode', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={defaultValues}
        template={templateValues}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Treino completo')).toBeInTheDocument();
    expect(screen.getByText('Sequencia semanal')).toBeInTheDocument();
    expect(screen.getByText('Limite diario')).toBeInTheDocument();
  });

  it('renders number inputs in editable mode', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={defaultValues}
        template={templateValues}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('spinbutton', { name: 'Treino completo' })).toHaveValue(10);
  });

  it('renders plain text in readOnly mode', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="readOnly"
        values={defaultValues}
        template={templateValues}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows banner text in readOnly mode', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="readOnly"
        values={defaultValues}
        template={templateValues}
        onClose={vi.fn()}
        bannerText="Campeonato em andamento."
      />
    );
    expect(screen.getByText('Campeonato em andamento.')).toBeInTheDocument();
  });

  it('shows preview message in preview mode', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="preview"
        values={defaultValues}
        template={templateValues}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/valores padrão serão aplicados/i)).toBeInTheDocument();
  });

  it('calls onSave with parsed values', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={defaultValues}
        template={templateValues}
        onSave={onSave}
        onClose={vi.fn()}
      />
    );
    const input = screen.getByRole('spinbutton', { name: 'Treino completo' });
    await user.clear(input);
    await user.type(input, '20');
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ ptsWorkoutCompleted: 20 })
    );
  });

  it('restores defaults when clicking Restaurar padrao', async () => {
    const user = userEvent.setup();
    const modifiedValues = { ...defaultValues, ptsWorkoutCompleted: 99 };
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={modifiedValues}
        template={templateValues}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const restoreBtn = screen.getByRole('button', { name: /restaurar padrão/i });
    expect(restoreBtn).not.toBeDisabled();
    await user.click(restoreBtn);
    expect(screen.getByRole('spinbutton', { name: 'Treino completo' })).toHaveValue(10);
  });

  it('disables Restaurar padrao when no template loaded', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={defaultValues}
        template={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /restaurar padrão/i })).toBeDisabled();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(
      <PointsBottomSheet
        mode="readOnly"
        values={defaultValues}
        template={templateValues}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows diff dots when values differ from template', () => {
    const modified = { ...defaultValues, ptsWorkoutCompleted: 99 };
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={modified}
        template={templateValues}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const dots = screen.getAllByLabelText('Valor diferente do padrão');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('shows status alert when provided', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={defaultValues}
        template={templateValues}
        onSave={vi.fn()}
        onClose={vi.fn()}
        statusAlert="Campeonato ficou ativo durante a edicao."
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Campeonato ficou ativo');
  });

  it('renders anonymousRanking toggle in editable mode', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={{ ...defaultValues, anonymousRanking: false }}
        template={{ ...templateValues, anonymousRanking: false }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Ranking anônimo')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Ranking anônimo' })).not.toBeChecked();
  });

  it('renders anonymousRanking as text in readOnly mode', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="readOnly"
        values={{ ...defaultValues, anonymousRanking: true }}
        template={{ ...templateValues, anonymousRanking: false }}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Ranking anônimo')).toBeInTheDocument();
    expect(screen.getByText('Sim')).toBeInTheDocument();
  });

  it('includes anonymousRanking in onSave payload', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={{ ...defaultValues, anonymousRanking: false }}
        template={{ ...templateValues, anonymousRanking: false }}
        onSave={onSave}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByRole('checkbox', { name: 'Ranking anônimo' }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ anonymousRanking: true })
    );
  });

  it('shows diff dot for anonymousRanking when different from template', () => {
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={{ ...defaultValues, anonymousRanking: true }}
        template={{ ...templateValues, anonymousRanking: false }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const dots = screen.getAllByLabelText('Valor diferente do padrão');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('restores anonymousRanking when clicking Restaurar padrao', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <PointsBottomSheet
        mode="editable"
        values={{ ...defaultValues, anonymousRanking: true }}
        template={{ ...templateValues, anonymousRanking: false }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /restaurar padrão/i }));
    expect(screen.getByRole('checkbox', { name: 'Ranking anônimo' })).not.toBeChecked();
  });
});
