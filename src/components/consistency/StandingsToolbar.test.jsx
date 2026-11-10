import { useState } from 'react';
import PropTypes from 'prop-types';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import StandingsToolbar from './StandingsToolbar';

const COUNTS = { all: 19, risk: 3, signal: 2, entering: 1, paused: 1 };

// Holds the tab, filter and search the way the page does, and echoes the search
const ToolbarHarness = ({ initialTab = 'current' }) => {
  const [tab, setTab] = useState(initialTab);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  return (
    <>
      <StandingsToolbar tab={tab} onTabChange={setTab} filter={filter} onFilterChange={setFilter} query={query} onQueryChange={setQuery} counts={COUNTS} />
      <output aria-label="Busca atual">{query}</output>
    </>
  );
};

ToolbarHarness.propTypes = {
  initialTab: PropTypes.string,
};

describe('StandingsToolbar', () => {
  it('switches the tab when a tab is used', async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);
    expect(screen.getByRole('tab', { name: 'Temporada atual' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Histórico geral' }));
    expect(screen.getByRole('tab', { name: 'Histórico geral' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Temporada atual' })).toHaveAttribute('aria-selected', 'false');
    await user.click(screen.getByRole('tab', { name: 'Temporadas anteriores' }));
    expect(screen.getByRole('tab', { name: 'Temporadas anteriores' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the five filters with their count and marks the active one', async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);
    expect(screen.getByRole('button', { name: 'Todos 19' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Em risco 3' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Com sinal 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrando 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Com semana pausada 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Em risco 3' }));
    expect(screen.getByRole('button', { name: 'Em risco 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todos 19' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('passes what the personal types in the search field', async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar aluno' }), 'joão');
    expect(screen.getByRole('searchbox', { name: 'Buscar aluno' })).toHaveValue('joão');
    expect(screen.getByLabelText('Busca atual')).toHaveTextContent('joão');
  });

  it('explains that the live average only goes up during the week', () => {
    render(<ToolbarHarness />);
    expect(screen.getByText('Média ao vivo: durante a semana a média só sobe. Valor real entra no fechamento.')).toBeInTheDocument();
  });

  it('keeps search and filters only on the current season tab', () => {
    render(<ToolbarHarness initialTab="history" />);
    expect(screen.queryByRole('searchbox', { name: 'Buscar aluno' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Em risco 3' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Histórico geral' })).toBeInTheDocument();
  });
});
