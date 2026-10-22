import { screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { renderWithRouter } from '../test/test-utils';
import LibraryPageHeader from './LibraryPageHeader';

describe('LibraryPageHeader', () => {
  it('renders the title as a level 1 heading', () => {
    renderWithRouter(<LibraryPageHeader icon={Users} title="Rotinas" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Rotinas' })).toBeInTheDocument();
  });

  it('renders actions passed via the actions prop', () => {
    renderWithRouter(
      <LibraryPageHeader title="Rotinas" actions={<button type="button">Nova rotina</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Nova rotina' })).toBeInTheDocument();
  });

  it('renders actions passed as children', () => {
    renderWithRouter(
      <LibraryPageHeader title="Rotinas">
        <button type="button">Nova rotina</button>
      </LibraryPageHeader>,
    );
    expect(screen.getByRole('button', { name: 'Nova rotina' })).toBeInTheDocument();
  });

  it('renders without actions', () => {
    renderWithRouter(<LibraryPageHeader title="Rotinas" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
