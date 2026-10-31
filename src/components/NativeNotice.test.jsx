import { render, screen } from '../test/test-utils';
import NativeNotice from './NativeNotice';

describe('NativeNotice', () => {
  it('renders the title as a heading, the body and the children', () => {
    render(
      <NativeNotice title="Atualização necessária" body="Instale a versão mais recente.">
        <button type="button">Atualizar</button>
      </NativeNotice>,
    );
    expect(screen.getByRole('heading', { name: 'Atualização necessária' })).toBeInTheDocument();
    expect(screen.getByText('Instale a versão mais recente.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument();
  });

  it('renders without children', () => {
    render(<NativeNotice title="Aviso" body="Texto" />);
    expect(screen.getByRole('heading', { name: 'Aviso' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
