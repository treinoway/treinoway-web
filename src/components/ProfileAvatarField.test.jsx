import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import ProfileAvatarField, { ProfileAvatar } from './ProfileAvatarField';

describe('ProfileAvatar', () => {
  it('renders the image when an avatar url exists', () => {
    render(<ProfileAvatar avatarUrl="https://cdn.example.com/a.png" initials="AS" />);
    expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute('src', 'https://cdn.example.com/a.png');
  });

  it('falls back to initials without an avatar url', () => {
    render(<ProfileAvatar initials="AS" />);
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('ProfileAvatarField', () => {
  it('hands the picked file to onSelect', async () => {
    const onSelect = vi.fn();
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    render(<ProfileAvatarField onSelect={onSelect} />);

    await userEvent.setup().upload(screen.getByLabelText('Foto de perfil'), file);

    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it('flags the input and explains why when the photo is missing', () => {
    render(<ProfileAvatarField invalid onSelect={vi.fn()} />);
    expect(screen.getByLabelText('Foto de perfil')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Adicione uma foto de perfil')).toBeInTheDocument();
  });

  it('disables the picker while uploading', () => {
    render(<ProfileAvatarField uploading onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
  });
});
