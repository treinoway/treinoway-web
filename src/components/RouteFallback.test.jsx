import { render, screen } from '../test/test-utils';
import { t } from '../i18n';
import RouteFallback from './RouteFallback';

describe('RouteFallback', () => {
  it('exposes a status with the route loading text', () => {
    render(<RouteFallback />);
    expect(screen.getByRole('status')).toHaveTextContent(t('nativeApp.routeLoading'));
  });
});
