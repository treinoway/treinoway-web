import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import {
  FreeMealSection,
  GuidancePreview,
  ObservationsSection,
  SupplementsSection,
  WaterSection,
} from './GuidanceSections';

describe('WaterSection', () => {
  it('shows litres, the cup summary and clears to null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WaterSection waterTargetMl={2500} weightKg={66} onChange={onChange} />);
    expect(screen.getByLabelText('Meta diária')).toHaveValue(2.5);
    expect(screen.getByText('No app: meta de 2,5 L, em 10 copos de 250 ml.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ingestão hídrica' })).toBeInTheDocument();
    expect(screen.getByText('Aparece no app')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Meta diária'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('suggests 35 ml/kg from the weight', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WaterSection waterTargetMl={null} weightKg={66} onChange={onChange} />);
    expect(screen.getByText('Sem meta de água definida.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar 35 ml/kg · 2,3 L' }));
    expect(onChange).toHaveBeenCalledWith(2300);
  });

  it('hides the suggestion without weight', () => {
    render(<WaterSection waterTargetMl={2000} weightKg={null} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Usar 35 ml\/kg/ })).not.toBeInTheDocument();
  });
});

describe('FreeMealSection', () => {
  it('shows the text with a counter and reports the frequency', async () => {
    const user = userEvent.setup();
    const onPerWeekChange = vi.fn();
    render(<FreeMealSection perWeek={1} text="No domingo" onPerWeekChange={onPerWeekChange} onTextChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Orientação' })).toHaveValue('No domingo');
    expect(screen.getByText('10/500')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '2 por semana' }));
    expect(onPerWeekChange).toHaveBeenCalledWith(2);
  });

  it('replaces the text by an explanation when free meals are off', () => {
    render(<FreeMealSection perWeek={0} text="" onPerWeekChange={vi.fn()} onTextChange={vi.fn()} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(/Sem refeição livre neste plano/)).toBeInTheDocument();
  });
});

describe('SupplementsSection', () => {
  const supplements = [{ key: 'k1', name: 'Whey', dose: '30 g', when: 'Pós-treino' }];

  it('labels dose and timing by the supplement name', () => {
    render(<SupplementsSection supplements={supplements} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByLabelText('Dose de whey')).toHaveValue('30 g');
    expect(screen.getByLabelText('Quando tomar whey')).toHaveValue('Pós-treino');
  });

  it('reports field edits by key, add and remove', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(<SupplementsSection supplements={supplements} onChange={onChange} onAdd={onAdd} onRemove={onRemove} />);
    await user.type(screen.getByLabelText('Dose de whey'), '0');
    expect(onChange).toHaveBeenCalledWith('k1', { dose: '30 g0' });
    await user.click(screen.getByRole('button', { name: 'Adicionar suplemento' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Remover whey' }));
    expect(onRemove).toHaveBeenCalledWith('k1');
  });
});

describe('ObservationsSection', () => {
  it('limits the notes to 2000 characters with a counter', () => {
    render(<ObservationsSection value="abc" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Observações do plano' })).toHaveAttribute('maxlength', '2000');
    expect(screen.getByText('3/2000')).toBeInTheDocument();
  });
});

describe('GuidancePreview', () => {
  it('mirrors water, free meal and supplements, and says the notes stay out of the app', () => {
    const supplements = [{ key: 'k1', name: 'Whey', dose: '30 g', when: 'Pós-treino' }, { key: 'k2', name: 'Creatina', dose: '', when: '' }];
    render(<GuidancePreview firstName="Luiza" waterTargetMl={2500} perWeek={0} supplements={supplements} />);
    const preview = screen.getByRole('region', { name: 'Como a Luiza vê' });
    expect(within(preview).getByText('2,5 L')).toBeInTheDocument();
    expect(within(preview).queryByText('Refeição livre')).not.toBeInTheDocument();
    expect(within(preview).getByText('Whey · 30 g')).toBeInTheDocument();
    expect(within(preview).getByText('Pós-treino')).toBeInTheDocument();
    expect(within(preview).getByText('Creatina · dose a definir')).toBeInTheDocument();
    expect(within(preview).getByText('horário a definir')).toBeInTheDocument();
    expect(within(preview).getByText('As observações do plano ficam no PDF, fora do app.')).toBeInTheDocument();
  });

  it('shows "-" without a water target', () => {
    render(<GuidancePreview firstName="Luiza" waterTargetMl={null} perWeek={1} freeMealText="No domingo" supplements={[]} />);
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('1 por semana')).toBeInTheDocument();
    expect(screen.getByText('No domingo')).toBeInTheDocument();
    expect(screen.queryByText('Suplementos')).not.toBeInTheDocument();
  });

  it('uses a neutral title when the patient name is unknown', () => {
    render(<GuidancePreview waterTargetMl={2000} perWeek={0} supplements={[]} />);
    expect(screen.getByRole('region', { name: 'Como o paciente vê' })).toBeInTheDocument();
  });
});

describe('badges', () => {
  it('tells where each block appears', () => {
    render(
      <>
        <SupplementsSection supplements={[]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} />
        <ObservationsSection value="" onChange={vi.fn()} />
      </>,
    );
    expect(screen.getByText('Aparece no app e no PDF')).toBeInTheDocument();
    expect(screen.getByText('Aparece no PDF')).toBeInTheDocument();
  });
});
