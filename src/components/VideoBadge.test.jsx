import { render, screen } from '../test/test-utils';
import ExerciseRowCard from './ExerciseRowCard';
import VideoBadge from './VideoBadge';
import { hasDemoMedia } from '../utils/demoMedia';

describe('VideoBadge', () => {
  it('shows the badge when the exercise has a video url', () => {
    render(<VideoBadge exercise={{ videoUrl: 'https://youtu.be/abc' }} />);
    expect(screen.getByRole('img', { name: 'Tem vídeo de demonstração' })).toBeInTheDocument();
    expect(screen.getByText('Vídeo')).toBeInTheDocument();
  });

  it('shows the badge for a GIF-only exercise', () => {
    render(<VideoBadge exercise={{ videoUrl: null, gifUrl: 'https://x.test/a.gif' }} />);
    expect(screen.getByText('Vídeo')).toBeInTheDocument();
  });

  it('renders nothing without media', () => {
    const { container } = render(<VideoBadge exercise={{ videoUrl: ' ', gifUrl: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not fall back to the template video (students play only the exercise own media)', () => {
    expect(hasDemoMedia({ videoUrl: null, exerciseTemplate: { videoUrl: 'https://youtu.be/abc' } })).toBe(false);
  });
});

describe('ExerciseRowCard video badge', () => {
  it('shows the badge next to the summary when media is present', () => {
    render(<ExerciseRowCard name="Supino" summary="3x10" media={{ videoUrl: 'https://youtu.be/abc' }} onClick={() => {}} />);
    expect(screen.getByText('Vídeo')).toBeInTheDocument();
  });

  it('hides the badge without media', () => {
    render(<ExerciseRowCard name="Supino" summary="3x10" media={{ videoUrl: null }} onClick={() => {}} />);
    expect(screen.queryByText('Vídeo')).not.toBeInTheDocument();
  });
});
