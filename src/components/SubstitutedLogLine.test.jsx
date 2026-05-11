import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '../test/test-utils';
import SubstitutedLogLine from './SubstitutedLogLine';

describe('SubstitutedLogLine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders original (struck-through) and new exercise names', () => {
    render(
      <SubstitutedLogLine
        originalName="Supino reto"
        newName="Crucifixo"
        swappedAt={new Date('2026-05-10T12:00:00Z')}
        onUndo={vi.fn()}
      />
    );
    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    expect(screen.getByText('Crucifixo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
  });

  it('updates the seconds-since label every second', () => {
    render(
      <SubstitutedLogLine
        originalName="A"
        newName="B"
        swappedAt={new Date('2026-05-10T12:00:00Z')}
        onUndo={vi.fn()}
      />
    );
    expect(screen.getByText('Trocado há 0s')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('Trocado há 3s')).toBeInTheDocument();
  });

  it('hides the undo button when undoDisabled is true', () => {
    render(
      <SubstitutedLogLine
        originalName="A"
        newName="B"
        swappedAt={new Date('2026-05-10T12:00:00Z')}
        undoDisabled
        onUndo={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
  });

  it('hides the undo button after the undo window elapses', () => {
    render(
      <SubstitutedLogLine
        originalName="A"
        newName="B"
        swappedAt={new Date('2026-05-10T12:00:00Z')}
        undoWindowSeconds={5}
        onUndo={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
  });

  it('calls onUndo when the undo button is clicked', () => {
    const onUndo = vi.fn();
    render(
      <SubstitutedLogLine
        originalName="A"
        newName="B"
        swappedAt={new Date('2026-05-10T12:00:00Z')}
        onUndo={onUndo}
      />
    );
    // Avoid userEvent + fake timers interaction by triggering the click directly.
    screen.getByRole('button', { name: 'Desfazer' }).click();
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('fires onAutoHide once the undo window closes', () => {
    const onAutoHide = vi.fn();
    render(
      <SubstitutedLogLine
        originalName="A"
        newName="B"
        swappedAt={new Date('2026-05-10T12:00:00Z')}
        undoWindowSeconds={3}
        onAutoHide={onAutoHide}
      />
    );
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onAutoHide).toHaveBeenCalled();
  });
});
