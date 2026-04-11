import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import BrandingPreview from './BrandingPreview';

describe('BrandingPreview', () => {
  it('renders the preview card title', () => {
    renderWithRouter(
      <BrandingPreview primaryColor="#1565C0" />
    );
    expect(screen.getByText('Prévia aproximada')).toBeInTheDocument();
  });

  it('renders the disclaimer text', () => {
    renderWithRouter(
      <BrandingPreview primaryColor="#1565C0" />
    );
    expect(
      screen.getByText(/A aparência final pode variar/i)
    ).toBeInTheDocument();
  });

  it('shows logo image when logoUrl is provided', () => {
    renderWithRouter(
      <BrandingPreview
        logoUrl="https://example.com/logo.png"
        primaryColor="#1565C0"
      />
    );
    expect(screen.getByAltText('Logo')).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('shows logo placeholder when logoUrl is not provided', () => {
    renderWithRouter(
      <BrandingPreview primaryColor="#1565C0" />
    );
    expect(screen.queryByAltText('Logo')).not.toBeInTheDocument();
    expect(document.querySelector('.app-mock-logo-placeholder')).toBeInTheDocument();
  });

  it('shows cover image when coverUrl is provided', () => {
    renderWithRouter(
      <BrandingPreview
        coverUrl="https://example.com/cover.png"
        primaryColor="#1565C0"
      />
    );
    expect(screen.getByAltText('Capa')).toHaveAttribute('src', 'https://example.com/cover.png');
  });

  it('shows cover placeholder when coverUrl is not provided', () => {
    renderWithRouter(
      <BrandingPreview primaryColor="#1565C0" />
    );
    expect(screen.queryByAltText('Capa')).not.toBeInTheDocument();
    expect(document.querySelector('.app-mock-cover-placeholder')).toBeInTheDocument();
  });

  it('shows welcome message when provided', () => {
    renderWithRouter(
      <BrandingPreview
        primaryColor="#1565C0"
        welcomeMessage="Bem-vindo ao treino!"
      />
    );
    expect(screen.getByText('Bem-vindo ao treino!')).toBeInTheDocument();
  });

  it('does not show welcome message when not provided', () => {
    renderWithRouter(
      <BrandingPreview primaryColor="#1565C0" />
    );
    expect(screen.queryByText('Bem-vindo ao treino!')).not.toBeInTheDocument();
  });

  it('applies primary color to header background', () => {
    renderWithRouter(
      <BrandingPreview primaryColor="#FF5733" />
    );
    const header = document.querySelector('.app-mock-header');
    expect(header).toHaveStyle({ background: '#FF5733' });
  });

  it('applies primary color to pill background', () => {
    renderWithRouter(
      <BrandingPreview primaryColor="#FF5733" />
    );
    const pill = document.querySelector('.app-mock-pill');
    expect(pill).toHaveStyle({ background: '#FF5733' });
  });
});
