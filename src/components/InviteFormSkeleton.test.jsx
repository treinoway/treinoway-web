import { render, screen } from '../test/test-utils';
import InviteFormSkeleton from './InviteFormSkeleton';

describe('InviteFormSkeleton', () => {
  it('announces that the invite is being verified', () => {
    render(<InviteFormSkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent('Verificando seu convite…');
  });
});
