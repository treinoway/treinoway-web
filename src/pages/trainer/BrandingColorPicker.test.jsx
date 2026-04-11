import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import BrandingColorPicker from './BrandingColorPicker';

describe('BrandingColorPicker', () => {
  it('renders the label', () => {
    renderWithRouter(
      <BrandingColorPicker label="Cor principal" value="#1565C0" onChange={vi.fn()} />
    );
    expect(screen.getByText('Cor principal')).toBeInTheDocument();
  });

  it('shows "(opcional)" text when optional prop is true', () => {
    renderWithRouter(
      <BrandingColorPicker label="Cor de destaque" value="#000000" onChange={vi.fn()} optional />
    );
    expect(screen.getByText('(opcional)')).toBeInTheDocument();
  });

  it('does not show "(opcional)" when optional prop is false', () => {
    renderWithRouter(
      <BrandingColorPicker label="Cor principal" value="#1565C0" onChange={vi.fn()} />
    );
    expect(screen.queryByText('(opcional)')).not.toBeInTheDocument();
  });

  it('displays the hex value', () => {
    renderWithRouter(
      <BrandingColorPicker label="Cor principal" value="#1565C0" onChange={vi.fn()} />
    );
    expect(screen.getByText('#1565C0')).toBeInTheDocument();
  });

  it('shows "—" when value is empty', () => {
    renderWithRouter(
      <BrandingColorPicker label="Cor de destaque" value="" onChange={vi.fn()} />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('calls onChange when color input changes', () => {
    const onChange = vi.fn();
    renderWithRouter(
      <BrandingColorPicker label="Cor principal" value="#1565C0" onChange={onChange} />
    );
    const input = screen.getByLabelText('Escolher Cor principal');
    fireEvent.change(input, { target: { value: '#FF5733' } });
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^#ff5733$/i));
  });

  it('shows contrast warning when contrastWarning is true', () => {
    renderWithRouter(
      <BrandingColorPicker
        label="Cor principal"
        value="#FFFF00"
        onChange={vi.fn()}
        contrastWarning
      />
    );
    expect(
      screen.getByText(/Contraste baixo/i)
    ).toBeInTheDocument();
  });

  it('does not show contrast warning when contrastWarning is false', () => {
    renderWithRouter(
      <BrandingColorPicker label="Cor principal" value="#1565C0" onChange={vi.fn()} />
    );
    expect(screen.queryByText(/Contraste baixo/i)).not.toBeInTheDocument();
  });
});
