import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import BrandingAssetUpload from './BrandingAssetUpload';

describe('BrandingAssetUpload', () => {
  it('renders upload area when no currentUrl is provided', () => {
    renderWithRouter(
      <BrandingAssetUpload
        label="Logo"
        onFileSelect={vi.fn()}
        aspect="square"
      />
    );
    expect(screen.getByText('Enviar logo')).toBeInTheDocument();
    expect(screen.getByText('JPEG, PNG ou WebP · Máx. 5MB')).toBeInTheDocument();
  });

  it('renders asset preview when currentUrl is provided', () => {
    renderWithRouter(
      <BrandingAssetUpload
        label="Logo"
        currentUrl="https://example.com/logo.png"
        onFileSelect={vi.fn()}
        aspect="square"
      />
    );
    expect(screen.getByAltText('Logo')).toHaveAttribute('src', 'https://example.com/logo.png');
    expect(screen.getByRole('button', { name: /Trocar/i })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderWithRouter(
      <BrandingAssetUpload
        label="Logo"
        description="Aparece no topo do app."
        onFileSelect={vi.fn()}
        aspect="square"
      />
    );
    expect(screen.getByText('Aparece no topo do app.')).toBeInTheDocument();
  });

  it('calls onFileSelect with the file when a valid file is selected', () => {
    const onFileSelect = vi.fn();
    renderWithRouter(
      <BrandingAssetUpload
        label="Logo"
        onFileSelect={onFileSelect}
        aspect="square"
      />
    );

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const input = screen.getByLabelText('Selecionar Logo');
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file, null);
  });

  it('calls onFileSelect with error message for invalid file type', () => {
    const onFileSelect = vi.fn();
    renderWithRouter(
      <BrandingAssetUpload
        label="Logo"
        onFileSelect={onFileSelect}
        aspect="square"
      />
    );

    const file = new File(['content'], 'test.gif', { type: 'image/gif' });
    const input = screen.getByLabelText('Selecionar Logo');
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(
      null,
      'Tipo de arquivo inválido. Apenas JPEG, PNG e WebP são permitidos.'
    );
  });

  it('calls onFileSelect with error message for file too large', () => {
    const onFileSelect = vi.fn();
    renderWithRouter(
      <BrandingAssetUpload
        label="Logo"
        onFileSelect={onFileSelect}
        aspect="square"
      />
    );

    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'big.png', { type: 'image/png' });
    const input = screen.getByLabelText('Selecionar Logo');
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(
      null,
      'Arquivo muito grande. O tamanho máximo é 5MB.'
    );
  });

  it('applies the correct aspect class on the preview container', () => {
    renderWithRouter(
      <BrandingAssetUpload
        label="Imagem de capa"
        currentUrl="https://example.com/cover.jpg"
        onFileSelect={vi.fn()}
        aspect="cover"
      />
    );
    expect(document.querySelector('.branding-asset-preview--cover')).toBeInTheDocument();
  });
});
