import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render, screen } from '../../../test/test-utils';
import OutlineSectionItem from './OutlineSectionItem';

const SECTION = { id: 's1', title: 'Saúde', questions: [] };

// Renders one section row with spies for selection and the reorder key handler.
const renderItem = ({ isGeneral }) => {
  const rowKeyDown = vi.fn();
  const onSelectSection = vi.fn();
  render(
    <OutlineSectionItem
      section={SECTION}
      isGeneral={isGeneral}
      rowProps={{ onKeyDown: rowKeyDown }}
      onSelectSection={onSelectSection}
      onSelectQuestion={vi.fn()}
      onDeleteSection={vi.fn()}
      onEditSection={vi.fn()}
      onDeleteQuestion={vi.fn()}
    />,
  );
  return { rowKeyDown, onSelectSection };
};

describe('OutlineSectionItem keyboard reorder', () => {
  it('forwards Alt + arrows to the reorder handler on a regular anamnesis', () => {
    const { rowKeyDown } = renderItem({ isGeneral: false });

    fireEvent.keyDown(screen.getByRole('button', { name: /^saúde/i }), { key: 'ArrowDown', altKey: true });

    expect(rowKeyDown).toHaveBeenCalledTimes(1);
  });

  it('never reorders the general anamnesis (its sections are fixed)', () => {
    const { rowKeyDown } = renderItem({ isGeneral: true });

    fireEvent.keyDown(screen.getByRole('button', { name: /^saúde/i }), { key: 'ArrowDown', altKey: true });

    expect(rowKeyDown).not.toHaveBeenCalled();
  });

  it('still selects the section with Enter', () => {
    const { onSelectSection } = renderItem({ isGeneral: true });

    fireEvent.keyDown(screen.getByRole('button', { name: /^saúde/i }), { key: 'Enter' });

    expect(onSelectSection).toHaveBeenCalledWith('s1');
  });
});
