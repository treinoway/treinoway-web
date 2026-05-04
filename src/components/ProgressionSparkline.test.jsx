import { describe, it, expect } from 'vitest';
import { renderWithRoute } from '../test/test-utils';
import ProgressionSparkline from './ProgressionSparkline';

describe('ProgressionSparkline', () => {
  it('renders with hidden class when hidden prop is true', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[100, 110, 120]} deltaPct={10} hidden />,
    );
    expect(container.querySelector('.progression-spark--hidden')).toBeInTheDocument();
  });

  it('does not apply hidden class when hidden is false', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[100, 110, 120]} deltaPct={10} hidden={false} />,
    );
    expect(container.querySelector('.progression-spark--hidden')).not.toBeInTheDocument();
  });

  it('renders up to 6 spark bars', () => {
    const loadHistory = [80, 90, 100, 110, 120, 130, 140]; // 7 values
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={loadHistory} deltaPct={5} />,
    );
    const bars = container.querySelectorAll('.spark-bar');
    expect(bars).toHaveLength(6);
  });

  it('renders fewer bars when loadHistory has fewer valid values', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[100, 110]} deltaPct={5} />,
    );
    const bars = container.querySelectorAll('.spark-bar');
    expect(bars).toHaveLength(2);
  });

  it('applies spark-bar--latest-up on last bar when deltaPct > 0', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[100, 110, 120]} deltaPct={10} />,
    );
    expect(container.querySelector('.spark-bar--latest-up')).toBeInTheDocument();
  });

  it('applies spark-bar--latest-down on last bar when deltaPct < 0', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[120, 110, 100]} deltaPct={-5} />,
    );
    expect(container.querySelector('.spark-bar--latest-down')).toBeInTheDocument();
  });

  it('applies spark-bar--latest on last bar when deltaPct is null', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[100, 110, 120]} deltaPct={null} />,
    );
    expect(container.querySelector('.spark-bar--latest')).toBeInTheDocument();
    expect(container.querySelector('.spark-bar--latest-up')).not.toBeInTheDocument();
    expect(container.querySelector('.spark-bar--latest-down')).not.toBeInTheDocument();
  });

  it('renders no bars when loadHistory is empty', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[]} deltaPct={null} />,
    );
    const bars = container.querySelectorAll('.spark-bar');
    expect(bars).toHaveLength(0);
  });

  it('filters out null/undefined values from loadHistory', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[100, null, undefined, 120]} deltaPct={5} />,
    );
    const bars = container.querySelectorAll('.spark-bar');
    expect(bars).toHaveLength(2);
  });

  it('is aria-hidden (decorative)', () => {
    const { container } = renderWithRoute(
      <ProgressionSparkline loadHistory={[100, 110]} deltaPct={5} />,
    );
    const el = container.querySelector('.progression-spark');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });
});
