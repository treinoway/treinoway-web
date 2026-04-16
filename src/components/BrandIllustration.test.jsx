import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import BrandIllustration from './BrandIllustration';

vi.mock('../assets/illustrations/index.js', () => ({
  emptyStudents: '/mock/empty-students.svg',
  emptyTrainings: '/mock/empty-trainings.svg',
  emptyExercises: '/mock/empty-exercises.svg',
  emptyProgress: '/mock/empty-progress.svg',
  achievementPr: '/mock/achievement-pr.svg',
  streak: '/mock/streak.svg',
}));

describe('BrandIllustration', () => {
  it('renders an img for a valid illustration name', () => {
    render(<BrandIllustration name="empty-students" />);
    const img = screen.getByRole('presentation');
    expect(img).toBeInTheDocument();
  });

  it('returns null for an unknown illustration name', () => {
    const { container } = render(<BrandIllustration name="does-not-exist" />);
    expect(container.firstChild).toBeNull();
  });

  it('applies extra className alongside brand-illustration', () => {
    const { container } = render(
      <BrandIllustration name="empty-trainings" className="my-custom-class" />
    );
    const img = container.querySelector('.brand-illustration.my-custom-class');
    expect(img).toBeInTheDocument();
  });

  it('applies the brand-illustration class without extra className', () => {
    const { container } = render(<BrandIllustration name="streak" />);
    expect(container.querySelector('.brand-illustration')).toBeInTheDocument();
  });

  it('sets width attribute to the size prop', () => {
    render(<BrandIllustration name="empty-progress" size={120} />);
    const img = screen.getByRole('presentation');
    expect(img).toHaveAttribute('width', '120');
  });

  it('defaults size to 200 when size prop is omitted', () => {
    render(<BrandIllustration name="achievement-pr" />);
    const img = screen.getByRole('presentation');
    expect(img).toHaveAttribute('width', '200');
  });

  it('has role presentation for decorative usage', () => {
    render(<BrandIllustration name="empty-exercises" />);
    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });

  it('has an empty alt attribute for screen reader compatibility', () => {
    render(<BrandIllustration name="empty-students" />);
    const img = screen.getByRole('presentation');
    expect(img).toHaveAttribute('alt', '');
  });
});
