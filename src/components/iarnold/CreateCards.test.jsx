import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import CreateCards from './CreateCards';
import { hasPlaceholders } from '../../utils/promptPlaceholders';

const CREATE_TITLES = ['Criar rotina completa', 'Montar treino', 'Cadastrar exercício'];
const TRACK_TITLES = ['Aplicar rotina a um aluno', 'Ajustar treino de um aluno', 'Analisar desempenho'];

describe('CreateCards', () => {
  it('lists three cards under "Criar" and three under "Acompanhar alunos"', () => {
    render(<CreateCards onSelect={vi.fn()} />);

    const createSection = screen.getByRole('region', { name: 'Criar' });
    const trackSection = screen.getByRole('region', { name: 'Acompanhar alunos' });

    CREATE_TITLES.forEach((title) => expect(within(createSection).getByRole('heading', { name: title })).toBeInTheDocument());
    TRACK_TITLES.forEach((title) => expect(within(trackSection).getByRole('heading', { name: title })).toBeInTheDocument());
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('has no nutrition or diet card and no invented hints', () => {
    const { container } = render(<CreateCards onSelect={vi.fn()} />);

    expect(container.textContent).not.toMatch(/dieta|nutri|alimentar|cutting|bulk|periodiza|semanas/i);
  });

  it.each([
    ['Criar rotina completa', /^Crie a rotina \{nome da rotina\}/],
    ['Montar treino', /^Monte o treino \{nome do treino\}/],
    ['Cadastrar exercício', /^Cadastre na biblioteca o exercício/],
    ['Aplicar rotina a um aluno', /^Aplique a rotina \{nome da rotina\} para o aluno \{nome do aluno\}/],
    ['Ajustar treino de um aluno', /^No treino \{nome do treino\} do aluno/],
    ['Analisar desempenho', /^Analise o desempenho do aluno/],
  ])('hands the "%s" prompt to onSelect without sending anything', async (title, expected) => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CreateCards onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: title }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.stringMatching(expected));
  });

  it('gives every card prompt at least one {placeholder} for the trainer to fill', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CreateCards onSelect={onSelect} />);

    for (const title of [...CREATE_TITLES, ...TRACK_TITLES]) {
      await user.click(screen.getByRole('button', { name: title }));
    }

    expect(onSelect).toHaveBeenCalledTimes(6);
    onSelect.mock.calls.forEach(([prompt]) => expect(hasPlaceholders(prompt)).toBe(true));
  });
});
