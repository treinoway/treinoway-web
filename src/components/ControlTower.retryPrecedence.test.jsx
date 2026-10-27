import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import ControlTower from './ControlTower';

describe('ControlTower retry vs welcome precedence', () => {
  it('shows the retry, not the new-trainer welcome, when the roster is empty and the fetch failed without cache', () => {
    renderWithRouter(
      <ControlTower data={null} loading={false} error="Erro de conexão" rosterEmpty onRetry={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument();
    expect(screen.queryByText('Seu painel ganha vida com o primeiro aluno')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Convidar primeiro aluno' })).not.toBeInTheDocument();
  });
});
