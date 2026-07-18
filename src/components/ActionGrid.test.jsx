import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import ActionGrid from './ActionGrid';

describe('ActionGrid', () => {
  it('renders its children inside the quick-actions grid', () => {
    const { container } = renderWithRouter(
      <ActionGrid>
        <div>Ação 1</div>
        <div>Ação 2</div>
      </ActionGrid>
    );

    expect(screen.getByText('Ação 1')).toBeInTheDocument();
    expect(screen.getByText('Ação 2')).toBeInTheDocument();
    expect(container.querySelector('.quick-actions')).toBeInTheDocument();
  });
});
