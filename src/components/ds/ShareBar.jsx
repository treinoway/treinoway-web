import PropTypes from 'prop-types';

const TONE_COUNT = 4;

// Width of a segment as its share of the total (0% when the total is zero).
const segmentWidth = (value, total) => (total > 0 ? `${Math.round((value / total) * 1000) / 10}%` : '0%');

// Stacked share bar (segment width = share of the sum, `--chart-*` colors by position) with a legend, announced as one image plus a screen-reader list of the values.
const ShareBar = ({ ariaLabel, segments }) => {
  const total = segments.reduce((sum, segment) => sum + (segment.value || 0), 0);
  return (
    <>
      <div className="share-bar" role="img" aria-label={ariaLabel}>
        <div className="share-bar__track">
          {segments.map((segment, index) => (
            <span
              key={segment.id}
              className={`share-bar__segment share-bar__tone-${(index % TONE_COUNT) + 1}`}
              style={{ width: segmentWidth(segment.value || 0, total) }}
            />
          ))}
        </div>
        <ul className="share-bar__legend type-caption">
          {segments.map((segment, index) => (
            <li key={segment.id} className="share-bar__legend-item">
              <span className={`share-bar__swatch share-bar__tone-${(index % TONE_COUNT) + 1}`} />
              <span className="share-bar__label">{segment.label}</span>
              <span className="share-bar__value">{(segment.value || 0).toLocaleString('pt-BR')}</span>
            </li>
          ))}
        </ul>
      </div>
      <ul className="visually-hidden">
        {segments.map((segment) => (
          <li key={segment.id}>{`${segment.label}: ${(segment.value || 0).toLocaleString('pt-BR')}`}</li>
        ))}
      </ul>
    </>
  );
};

ShareBar.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default ShareBar;
