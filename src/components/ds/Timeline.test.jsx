import { render, screen, within } from '../../test/test-utils';
import Timeline from './Timeline';

const DS = {
  Timeline: 'timeline',
  item: 'timeline__item',
  marker: 'timeline__marker',
  connector: 'timeline__connector',
  title: 'timeline__title',
  caption: 'timeline__caption',
  content: 'timeline__content',
};

const ITEMS = [
  { id: 'a', state: 'answered', title: '7 dias', caption: 'Respondido em 03/11', content: <strong>62</strong> },
  { id: 'b', state: 'expired', title: '15 dias', caption: 'Enviado em 11/11' },
  { id: 'c', state: 'pending', title: 'Envio manual', caption: 'Enviado em 24/11' },
  { id: 'd', state: 'upcoming', title: '30 dias', caption: 'Agendado para 26/11' },
];

// Renders the timeline with the given items under the name "Etapas"
const renderTimeline = (items = ITEMS) => render(<Timeline ariaLabel="Etapas" items={items} />);

// Items of the timeline, in the order shown
const timelineItems = () => within(screen.getByRole('list', { name: 'Etapas' })).queryAllByRole('listitem');

describe('Timeline', () => {
  it('is an ordered list named by ariaLabel, with the block class', () => {
    renderTimeline();

    const list = screen.getByRole('list', { name: 'Etapas' });
    expect(list.tagName).toBe('OL');
    expect(list).toHaveClass(DS.Timeline);
  });

  it('renders one list item per entry, in the order received', () => {
    renderTimeline();

    const items = timelineItems();
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('7 dias')).toBeInTheDocument();
    expect(within(items[1]).getByText('15 dias')).toBeInTheDocument();
    expect(within(items[2]).getByText('Envio manual')).toBeInTheDocument();
    expect(within(items[3]).getByText('30 dias')).toBeInTheDocument();
  });

  it('marks each item with the modifier of its state and no other', () => {
    renderTimeline();

    const [answered, expired, pending, upcoming] = timelineItems();
    expect(answered).toHaveClass(DS.item, 'timeline__item--answered');
    expect(expired).toHaveClass(DS.item, 'timeline__item--expired');
    expect(pending).toHaveClass(DS.item, 'timeline__item--pending');
    expect(upcoming).toHaveClass(DS.item, 'timeline__item--upcoming');
    expect(answered).not.toHaveClass('timeline__item--upcoming');
    expect(upcoming).not.toHaveClass('timeline__item--answered');
  });

  it('shows the title and the caption of each item in their own elements', () => {
    renderTimeline();

    const [answered] = timelineItems();
    expect(within(answered).getByText('7 dias')).toHaveClass(DS.title);
    expect(within(answered).getByText('Respondido em 03/11')).toHaveClass(DS.caption);
  });

  it('renders the content of an item inside it, and no content wrapper when there is none', () => {
    renderTimeline();

    const [answered, expired] = timelineItems();
    expect(within(answered).getByText('62').parentElement).toHaveClass(DS.content);
    expect(expired.querySelector(`.${DS.content}`)).toBeNull();
  });

  it('renders no caption element for an item without caption', () => {
    renderTimeline([{ id: 'a', state: 'answered', title: '7 dias' }]);

    const [item] = timelineItems();
    expect(within(item).getByText('7 dias')).toBeInTheDocument();
    expect(item.querySelector(`.${DS.caption}`)).toBeNull();
  });

  it('draws one marker per item, hidden from assistive technology', () => {
    renderTimeline();

    timelineItems().forEach((item) => {
      const markers = item.querySelectorAll(`.${DS.marker}`);
      expect(markers).toHaveLength(1);
      expect(markers[0]).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('draws a connector after every item but the last, hidden from assistive technology', () => {
    renderTimeline();

    const items = timelineItems();
    items.slice(0, -1).forEach((item) => {
      const connectors = item.querySelectorAll(`.${DS.connector}`);
      expect(connectors).toHaveLength(1);
      expect(connectors[0]).toHaveAttribute('aria-hidden', 'true');
    });
    expect(items[3].querySelector(`.${DS.connector}`)).toBeNull();
  });

  it('draws no connector when there is a single item', () => {
    renderTimeline([ITEMS[0]]);

    expect(timelineItems()[0].querySelector(`.${DS.connector}`)).toBeNull();
  });

  it('renders the empty list when there are no items', () => {
    renderTimeline([]);

    expect(screen.getByRole('list', { name: 'Etapas' })).toHaveClass(DS.Timeline);
    expect(timelineItems()).toHaveLength(0);
  });

  it('has nothing to interact with: no buttons and no links', () => {
    renderTimeline();

    expect(timelineItems()).toHaveLength(4);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
