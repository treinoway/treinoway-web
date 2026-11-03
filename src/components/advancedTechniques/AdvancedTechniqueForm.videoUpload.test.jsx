import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import AdvancedTechniqueForm from './AdvancedTechniqueForm';
import { OWN_TECHNIQUE } from '../../test/advancedTechniqueFixtures';

vi.mock('../../api/exerciseVideos', () => ({ uploadExerciseVideo: vi.fn() }));

describe('AdvancedTechniqueForm — no gallery upload', () => {
  it('keeps the YouTube link field but never offers the gallery upload (exercises only)', () => {
    render(<AdvancedTechniqueForm technique={OWN_TECHNIQUE} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/url do vídeo/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar vídeo da galeria' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Selecionar vídeo')).not.toBeInTheDocument();
  });
});
