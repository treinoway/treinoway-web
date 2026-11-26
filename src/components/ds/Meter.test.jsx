import { render, screen } from '../../test/test-utils';
import Meter from './Meter';

const DS = { Meter: 'meter', fill: 'meter__fill' };

// Filled part of the meter named by the given label
const fillOf = (label) => screen.getByRole('img', { name: label }).querySelector(`.${DS.fill}`);

describe('Meter', () => {
  it('is a read-only image named by its label, with the block class', () => {
    render(<Meter value={25} label="25 de 100" />);

    const meter = screen.getByRole('img', { name: '25 de 100' });
    expect(meter).toHaveClass(DS.Meter);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('fills the bar by the value as a percentage', () => {
    render(<Meter value={25} label="25 de 100" />);

    expect(fillOf('25 de 100')).toHaveStyle({ width: '25%' });
  });

  it('fills the whole bar at 100 and nothing at 0', () => {
    render(
      <>
        <Meter value={100} label="100 de 100" />
        <Meter value={0} label="0 de 100" />
      </>,
    );

    expect(fillOf('100 de 100')).toHaveStyle({ width: '100%' });
    expect(fillOf('0 de 100')).toHaveStyle({ width: '0%' });
  });

  it('clamps a value outside 0-100 to the nearest end', () => {
    render(
      <>
        <Meter value={140} label="acima" />
        <Meter value={-5} label="abaixo" />
      </>,
    );

    expect(fillOf('acima')).toHaveStyle({ width: '100%' });
    expect(fillOf('abaixo')).toHaveStyle({ width: '0%' });
  });

  it('draws an empty bar when the value is missing', () => {
    render(<Meter value={null} label="sem nota" />);

    expect(fillOf('sem nota')).toHaveStyle({ width: '0%' });
  });

  it('carries the modifier of the tone: success, warning and danger', () => {
    render(
      <>
        <Meter value={90} label="bom" tone="success" />
        <Meter value={60} label="estável" tone="warning" />
        <Meter value={25} label="atenção" tone="danger" />
      </>,
    );

    expect(screen.getByRole('img', { name: 'bom' })).toHaveClass(DS.Meter, 'meter--success');
    expect(screen.getByRole('img', { name: 'estável' })).toHaveClass(DS.Meter, 'meter--warning');
    expect(screen.getByRole('img', { name: 'atenção' })).toHaveClass(DS.Meter, 'meter--danger');
    expect(screen.getByRole('img', { name: 'bom' })).not.toHaveClass('meter--danger');
  });

  it('falls back to the neutral tone', () => {
    render(<Meter value={50} label="50 de 100" />);

    const meter = screen.getByRole('img', { name: '50 de 100' });
    expect(meter).toHaveClass('meter--neutral');
    expect(meter).not.toHaveClass('meter--success');
    expect(meter).not.toHaveClass('meter--warning');
    expect(meter).not.toHaveClass('meter--danger');
  });

  it('adds the extra class name next to its own', () => {
    render(<Meter value={50} label="50 de 100" className="extra" />);

    expect(screen.getByRole('img', { name: '50 de 100' })).toHaveClass(DS.Meter, 'meter--neutral', 'extra');
  });
});
