import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import ChampionshipPodium from './ChampionshipPodium';

// Podium place as the tabs build it from a standings or ranking row
const placeOf = (position, name, overrides = {}) => ({
  studentId: `s${position}`,
  position,
  name,
  avatarUrl: null,
  score: `${100 - position}%`,
  support: `${4 - position} semanas a 100% · sequência de ${5 - position} semanas`,
  ...overrides,
});

const THREE = [placeOf(1, 'Juliana Mendes'), placeOf(2, 'Pedro Santos'), placeOf(3, 'Lucas Ferreira')];

describe('ChampionshipPodium', () => {
  it('orders the places 2nd, 1st, 3rd with medal, avatar, name, score and support line', () => {
    render(<ChampionshipPodium places={THREE} />);

    const places = within(screen.getByRole('list', { name: 'Pódio' })).getAllByRole('listitem');
    expect(places.map((place) => place.getAttribute('aria-label'))).toEqual(['2º lugar', '1º lugar', '3º lugar']);

    const leader = places[1];
    expect(within(leader).getByText('1º lugar')).toBeInTheDocument();
    expect(leader.querySelector('.avatar')).toHaveTextContent('JM');
    expect(within(leader).getByText('Juliana Mendes')).toBeInTheDocument();
    expect(within(leader).getByText('99%')).toBeInTheDocument();
    expect(within(leader).getByText('3 semanas a 100% · sequência de 4 semanas')).toBeInTheDocument();
    expect(leader).toHaveClass('championship-podium__place--leader');
    expect(within(places[0]).getByText('Pedro Santos')).toBeInTheDocument();
    expect(within(places[2]).getByText('Lucas Ferreira')).toBeInTheDocument();
  });

  it('CPD-80 shows only the occupied places with fewer than three classified', () => {
    const { rerender } = render(<ChampionshipPodium places={THREE.slice(0, 2)} />);

    let places = within(screen.getByRole('list', { name: 'Pódio' })).getAllByRole('listitem');
    expect(places.map((place) => place.getAttribute('aria-label'))).toEqual(['2º lugar', '1º lugar']);
    expect(screen.queryByText('3º lugar')).not.toBeInTheDocument();

    rerender(<ChampionshipPodium places={THREE.slice(0, 1)} />);
    places = within(screen.getByRole('list', { name: 'Pódio' })).getAllByRole('listitem');
    expect(places.map((place) => place.getAttribute('aria-label'))).toEqual(['1º lugar']);

    rerender(<ChampionshipPodium places={[]} />);
    expect(screen.queryByRole('list', { name: 'Pódio' })).not.toBeInTheDocument();
  });

  it('labels a tied place by its shared position', () => {
    render(<ChampionshipPodium places={[placeOf(1, 'Ana Lima'), placeOf(2, 'Bia Souza'), placeOf(2, 'Caio Reis', { studentId: 's9' })]} />);

    const places = within(screen.getByRole('list', { name: 'Pódio' })).getAllByRole('listitem');
    expect(places.map((place) => place.getAttribute('aria-label'))).toEqual(['2º lugar', '1º lugar', '2º lugar']);
  });
});
