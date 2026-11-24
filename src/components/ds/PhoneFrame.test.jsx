import { render, screen, within } from '../../test/test-utils';
import PhoneFrame from './PhoneFrame';

const DS = { PhoneFrame: 'phone-frame' };

describe('PhoneFrame', () => {
  it('renders its children inside the frame root', () => {
    render(
      <PhoneFrame label="Como o aluno vê">
        <p>Como foi sua adesão ao treino?</p>
      </PhoneFrame>,
    );

    const frame = screen.getByLabelText('Como o aluno vê');
    expect(frame).toHaveClass(DS.PhoneFrame);
    expect(within(frame).getByText('Como foi sua adesão ao treino?')).toBeInTheDocument();
  });

  it('uses the label as the accessible name of the frame', () => {
    render(
      <PhoneFrame label="Prévia do feedback">
        <button type="button">Próxima</button>
      </PhoneFrame>,
    );

    const frame = screen.getByLabelText('Prévia do feedback');
    expect(frame).toHaveAccessibleName('Prévia do feedback');
    expect(within(frame).getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Como o aluno vê')).not.toBeInTheDocument();
  });
});
