import PropTypes from 'prop-types';

const TOTAL_BARS = 30;

const SHORT_MONTH_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const formatAxisDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!month || !day) return '';
  return `${day} ${SHORT_MONTH_PT[month - 1]}`;
};

/**
 * Revenue waveform — 30-bar visualization for the Financeiro hero.
 * Each bar represents one day. Height encodes revenue amount.
 * Status: success (paid), partial (pending), danger (overdue), empty (future/no data).
 * Today marker: vertical hairline + "HOJE" tag.
 *
 * Props:
 *  bars: Array of { date, status, pct, isToday }
 */
const RevenueWaveform = ({ bars }) => {
  const displayBars = bars && bars.length > 0
    ? bars
    : Array.from({ length: TOTAL_BARS }, (_, i) => ({
      date: null,
      status: 'empty',
      pct: 0,
      isToday: false,
      _ghost: true,
      _index: i,
    }));

  const firstBar = displayBars[0];
  const lastBar = displayBars[displayBars.length - 1];

  return (
    <div className="fin-waveform">
      <div className="pulse-wave">
        <div className="pulse-wave-axis" aria-hidden="true">
          <span>{formatAxisDate(firstBar?.date)}</span>
          <span>{formatAxisDate(lastBar?.date)}</span>
        </div>

        <div
          className="pulse-wave-bars"
          role="group"
          aria-label="Receita dos últimos 30 dias"
        >
          {displayBars.map((bar, index) => {
            const isToday = bar.isToday === true;
            const isEmpty = bar.status === 'empty' || bar._ghost;

            const fillModifier = bar._ghost ? 'empty' : bar.status;
            const barKey = bar.date ?? `ghost-${bar._index ?? index}`;

            const barClassNames = [
              'pulse-bar',
              isToday ? 'pulse-bar--today' : '',
            ].filter(Boolean).join(' ');

            const fillClassNames = [
              'pulse-bar-fill',
              `pulse-bar-fill--${fillModifier}`,
            ].join(' ');

            const heightStyle = isEmpty ? undefined : { height: `${bar.pct ?? 0}%` };

            return (
              <div
                key={barKey}
                className={barClassNames}
                role={isEmpty ? undefined : 'img'}
                aria-label={
                  isEmpty
                    ? undefined
                    : `${bar.date}: ${bar.status}`
                }
              >
                <div
                  className={fillClassNames}
                  style={heightStyle}
                />
              </div>
            );
          })}
        </div>

        <div className="pulse-wave-key" aria-hidden="true">
          <span className="pulse-wave-key-item">
            <span className="pulse-wave-key-swatch pulse-wave-key-swatch--success" />
            Recebido
          </span>
          <span className="pulse-wave-key-item">
            <span className="pulse-wave-key-swatch pulse-wave-key-swatch--partial" />
            Pendente
          </span>
          <span className="pulse-wave-key-item">
            <span className="pulse-wave-key-swatch pulse-wave-key-swatch--danger" />
            Atrasado
          </span>
          <span className="pulse-wave-key-meta">altura = valor</span>
        </div>
      </div>
    </div>
  );
};

RevenueWaveform.propTypes = {
  bars: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      status: PropTypes.oneOf(['success', 'partial', 'danger', 'empty']),
      pct: PropTypes.number,
      isToday: PropTypes.bool,
    }),
  ),
};

export default RevenueWaveform;
