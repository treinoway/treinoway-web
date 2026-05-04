import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import PeriodPickerSheet from './PeriodPickerSheet';
import { DASHBOARD_PERIOD_PRESETS } from '../constants/dashboardPeriod';

const baseCurrent = {
  presetKey: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
  from: '2026-04-02T00:00:00.000Z',
  to: '2026-05-02T00:00:00.000Z',
};

describe('PeriodPickerSheet', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <PeriodPickerSheet open={false} currentPeriod={baseCurrent} onApply={() => {}} onCancel={() => {}} />,
    );
    expect(container.querySelector('.period-picker-sheet')).not.toBeInTheDocument();
  });

  it('renders title and presets when open', () => {
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText('Período')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Últimos 30 dias' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Últimos 90 dias' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Últimos 6 meses' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Último 1 ano' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Personalizar' })).toBeInTheDocument();
  });

  it('marks the current preset as selected', () => {
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole('radio', { name: 'Últimos 30 dias' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Últimos 90 dias' })).toHaveAttribute('aria-checked', 'false');
  });

  it('disables Aplicar when no change has been made', () => {
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
  });

  it('enables Aplicar when a different preset is selected', async () => {
    const user = userEvent.setup();
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={() => {}} onCancel={() => {}} />,
    );
    await user.click(screen.getByRole('radio', { name: 'Últimos 90 dias' }));
    expect(screen.getByRole('button', { name: 'Aplicar' })).not.toBeDisabled();
  });

  it('calls onApply with the selected preset (deferred apply)', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={onApply} onCancel={() => {}} />,
    );
    await user.click(screen.getByRole('radio', { name: 'Últimos 90 dias' }));
    // Tapping a preset must NOT trigger onApply.
    expect(onApply).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0].presetKey).toBe(DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS);
  });

  it('calls onCancel when "Cancelar" is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={() => {}} onCancel={onCancel} />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows custom date inputs when "Personalizar" is selected', async () => {
    const user = userEvent.setup();
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={() => {}} onCancel={() => {}} />,
    );
    await user.click(screen.getByRole('radio', { name: 'Personalizar' }));
    expect(screen.getByLabelText('De')).toBeInTheDocument();
    expect(screen.getByLabelText('Até')).toBeInTheDocument();
  });

  it('keeps Aplicar disabled when custom range is incomplete', async () => {
    const user = userEvent.setup();
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={() => {}} onCancel={() => {}} />,
    );
    await user.click(screen.getByRole('radio', { name: 'Personalizar' }));
    await user.type(screen.getByLabelText('De'), '2026-01-01');
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
  });

  it('shows the same-day hint when from and to match', async () => {
    const user = userEvent.setup();
    render(
      <PeriodPickerSheet open currentPeriod={baseCurrent} onApply={() => {}} onCancel={() => {}} />,
    );
    await user.click(screen.getByRole('radio', { name: 'Personalizar' }));
    await user.type(screen.getByLabelText('De'), '2026-01-15');
    await user.type(screen.getByLabelText('Até'), '2026-01-15');
    expect(screen.getByText(/Selecionando apenas 1 dia/)).toBeInTheDocument();
  });

  it('renders inline error message', () => {
    render(
      <PeriodPickerSheet
        open
        currentPeriod={baseCurrent}
        onApply={() => {}}
        onCancel={() => {}}
        errorMessage="Período inválido. Tente novamente."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Período inválido. Tente novamente.');
  });
});
