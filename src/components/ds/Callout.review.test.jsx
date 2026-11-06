import { render } from '../../test/test-utils';
import Callout from './Callout';

describe('Callout optional title', () => {
  it('renders no title element and no with-title body modifier when title is omitted', () => {
    const { container } = render(<Callout onClose={vi.fn()}>Corpo</Callout>);
    expect(container.querySelector('.ds-callout__title')).not.toBeInTheDocument();
    const body = container.querySelector('.ds-callout__body');
    expect(body).toHaveTextContent('Corpo');
    expect(body).not.toHaveClass('ds-callout__body--with-title');
  });

  it('renders the title and adds the with-title body modifier when title is given', () => {
    const { container } = render(<Callout title="Título" onClose={vi.fn()}>Corpo</Callout>);
    expect(container.querySelector('.ds-callout__title')).toHaveTextContent('Título');
    expect(container.querySelector('.ds-callout__body')).toHaveClass('ds-callout__body--with-title');
  });
});
