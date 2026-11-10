import { useState } from 'react';
import PropTypes from 'prop-types';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import RulesSection from './RulesSection';

const DEFAULT_CONFIG = {
  minPodiumWeeks: 2,
  closeWeekday: 0,
  closeHour: 21,
  timeZone: 'America/Sao_Paulo',
  minWorkoutMinutes: 10,
  riskLimit: 70,
  riskWeeks: 2,
  batchCount: 5,
  batchMinutes: 30,
};

// Stateful stand-in for the settings page: keeps the draft and exposes every change to the spy
const Harness = ({ initialConfig = DEFAULT_CONFIG, onChange = () => {} }) => {
  const [config, setConfig] = useState(initialConfig);
  const handleChange = (field, value) => {
    onChange(field, value);
    setConfig((current) => ({ ...current, [field]: value }));
  };
  return <RulesSection config={config} onChange={handleChange} />;
};

Harness.propTypes = {
  initialConfig: PropTypes.object,
  onChange: PropTypes.func,
};

// Select of a rule by its accessible name
const selectOf = (name) => screen.getByRole('combobox', { name });

describe('RulesSection', () => {
  it('PAN-41 renders all fairness rules with the values of the configuration', () => {
    render(<Harness />);
    expect(selectOf('Mínimo para o pódio')).toHaveDisplayValue('2 semanas válidas');
    expect(within(screen.getByRole('group', { name: 'Fechamento da semana' })).getAllByRole('combobox')).toHaveLength(2);
    expect(selectOf('Dia do fechamento')).toHaveDisplayValue('Domingo');
    expect(selectOf('Hora do fechamento')).toHaveDisplayValue('21:00');
    expect(selectOf('Tempo mínimo de treino')).toHaveDisplayValue('10 minutos');
    expect(selectOf('Alerta de risco')).toHaveDisplayValue('Abaixo de 70% por 2 semanas');
    expect(selectOf('Registro em lote')).toHaveDisplayValue('5 registros em 30 min');
  });

  it('PAN-41 names the time zone in the support text of the close', () => {
    render(<Harness />);
    expect(screen.getByText('Fuso America/Sao_Paulo. Registros depois ficam no histórico.')).toBeInTheDocument();
  });

  it('PAN-41 offers 1 to 4 weeks for the podium minimum and applies the choice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const select = selectOf('Mínimo para o pódio');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      '1 semana válida',
      '2 semanas válidas',
      '3 semanas válidas',
      '4 semanas válidas',
    ]);
    await user.selectOptions(select, '4 semanas válidas');
    expect(select).toHaveDisplayValue('4 semanas válidas');
    expect(onChange).toHaveBeenCalledWith('minPodiumWeeks', 4);
  });

  it('PAN-41 changes the close day and hour', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.selectOptions(selectOf('Dia do fechamento'), 'Segunda');
    await user.selectOptions(selectOf('Hora do fechamento'), '18:00');
    expect(selectOf('Dia do fechamento')).toHaveDisplayValue('Segunda');
    expect(selectOf('Hora do fechamento')).toHaveDisplayValue('18:00');
    expect(onChange).toHaveBeenCalledWith('closeWeekday', 1);
    expect(onChange).toHaveBeenCalledWith('closeHour', 18);
  });

  it('PAN-41 changes the minimum workout time', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.selectOptions(selectOf('Tempo mínimo de treino'), '20 minutos');
    expect(selectOf('Tempo mínimo de treino')).toHaveDisplayValue('20 minutos');
    expect(onChange).toHaveBeenCalledWith('minWorkoutMinutes', 20);
  });

  it('PAN-41 changes the risk alert limit and weeks together from one select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const options = within(selectOf('Alerta de risco')).getAllByRole('option').map((option) => option.textContent);
    expect(options[0]).toBe('Abaixo de 50% por 1 semana');
    expect(options).toContain('Abaixo de 90% por 4 semanas');
    await user.selectOptions(selectOf('Alerta de risco'), 'Abaixo de 80% por 3 semanas');
    expect(selectOf('Alerta de risco')).toHaveDisplayValue('Abaixo de 80% por 3 semanas');
    expect(onChange).toHaveBeenCalledWith('riskLimit', 80);
    expect(onChange).toHaveBeenCalledWith('riskWeeks', 3);
  });

  it('PAN-41 changes the batch registration count and minutes together from one select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.selectOptions(selectOf('Registro em lote'), '8 registros em 60 min');
    expect(selectOf('Registro em lote')).toHaveDisplayValue('8 registros em 60 min');
    expect(onChange).toHaveBeenCalledWith('batchCount', 8);
    expect(onChange).toHaveBeenCalledWith('batchMinutes', 60);
  });

  it('PAN-41 still shows a saved value that is not one of the usual steps', () => {
    render(<Harness initialConfig={{ ...DEFAULT_CONFIG, minWorkoutMinutes: 7, riskLimit: 73 }} />);
    expect(selectOf('Tempo mínimo de treino')).toHaveDisplayValue('7 minutos');
    expect(selectOf('Alerta de risco')).toHaveDisplayValue('Abaixo de 73% por 2 semanas');
  });

  it('PAN-41 does not offer the streak start rule of a later feature', () => {
    render(<Harness />);
    expect(screen.queryByText('Sequência conta semanas a partir de')).not.toBeInTheDocument();
  });
});
