import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import WizardStepper from './WizardStepper';

const steps = [
  { id: 's1', title: 'Saúde' },
  { id: 's2', title: 'Rotina' },
  { id: 'review', title: 'Revisão' },
];

describe('WizardStepper', () => {
  it('exposes progress with aria values and a descriptive text', () => {
    render(<WizardStepper steps={steps} currentIndex={1} onSelect={vi.fn()} />);
    const progress = screen.getByRole('progressbar', { name: 'Progresso da anamnese' });
    expect(progress).toHaveAttribute('aria-valuenow', '2');
    expect(progress).toHaveAttribute('aria-valuemax', '3');
    expect(progress).toHaveAttribute('aria-valuetext', 'Etapa 2 de 3: Rotina');
    expect(screen.getByText('Etapa 2 de 3')).toBeInTheDocument();
  });

  it('lists the named steps and marks the current one', () => {
    render(<WizardStepper steps={steps} currentIndex={1} onSelect={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[2]).toHaveTextContent('Revisão');
  });

  it('lets the user jump back to completed steps only', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WizardStepper steps={steps} currentIndex={1} onSelect={onSelect} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Saúde/ }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('has no completed steps on the first step', () => {
    render(<WizardStepper steps={steps} currentIndex={0} onSelect={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('allowJumpAhead', () => {
    it('makes every step a button, including future ones and the review', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<WizardStepper steps={steps} currentIndex={0} onSelect={onSelect} allowJumpAhead />);
      expect(screen.getAllByRole('button')).toHaveLength(3);
      await user.click(screen.getByRole('button', { name: /Rotina/ }));
      await user.click(screen.getByRole('button', { name: /Revisão/ }));
      expect(onSelect).toHaveBeenNthCalledWith(1, 1);
      expect(onSelect).toHaveBeenNthCalledWith(2, 2);
    });

    it('keeps aria-current on the active step only', () => {
      render(<WizardStepper steps={steps} currentIndex={1} onSelect={vi.fn()} allowJumpAhead />);
      const items = screen.getAllByRole('listitem');
      expect(items[1]).toHaveAttribute('aria-current', 'step');
      expect(items[0]).not.toHaveAttribute('aria-current');
      expect(items[2]).not.toHaveAttribute('aria-current');
    });

    it('does not mark a passed step with pending answers as done', () => {
      const withPending = [{ ...steps[0], pending: 2 }, { ...steps[1], pending: 0 }, steps[2]];
      render(<WizardStepper steps={withPending} currentIndex={2} onSelect={vi.fn()} allowJumpAhead />);
      const items = screen.getAllByRole('listitem');
      expect(items[0]).not.toHaveClass('anamnesis-stepper-item--done');
      expect(items[1]).toHaveClass('anamnesis-stepper-item--done');
    });

    it('is off by default, so future steps stay static', () => {
      render(<WizardStepper steps={steps} currentIndex={0} onSelect={vi.fn()} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
