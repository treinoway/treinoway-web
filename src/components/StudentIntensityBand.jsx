import PropTypes from 'prop-types';
import {
  EXERCISE_INTENSITY_KEYS,
  getIntensityTier,
  getIntensityFallbackLabel,
} from '../constants/exerciseIntensity';
import IntensityBadge from './IntensityBadge';

/**
 * Student-facing read-only effort band shown on cardio exercises.
 * Uses the real `.theme-stadium` class (dark bg/padding/radius/shadow come
 * from the cascade); the value reads as a performance metric via StatDisplay.
 *
 * Renders nothing when there is no intensity key.
 */
const StudentIntensityBand = ({ exerciseName, summary, intensity, label }) => {
  if (!intensity) return null;
  const tier = getIntensityTier(intensity);
  if (!tier) return null;

  const text = label || getIntensityFallbackLabel(intensity);
  const heading = summary ? `${exerciseName} · ${summary}` : exerciseName;

  return (
    <div className="theme-stadium student-intensity">
      <div className="student-intensity-head">
        <div>
          <div className="student-intensity-eyebrow">Alvo de esforço</div>
          <div className="student-intensity-name">{heading}</div>
        </div>
        <IntensityBadge intensity={intensity} label={text} />
      </div>

      <div className="stat-display">
        <span className="stat-display-value">{text}</span>
        <span className="stat-display-label">Nível ACSM {tier} de 5</span>
      </div>

      <div className="student-intensity-ramp" aria-hidden="true">
        {EXERCISE_INTENSITY_KEYS.map((key) => {
          const segTier = getIntensityTier(key);
          const on = segTier === tier;
          return (
            <span
              key={key}
              className={`student-intensity-seg${on ? ' student-intensity-seg--on' : ''}`}
              data-tier={on ? segTier : undefined}
            />
          );
        })}
      </div>
      <div className="student-intensity-scale">
        <span>Muito leve</span>
        <span>Quase máx.</span>
      </div>
    </div>
  );
};

StudentIntensityBand.propTypes = {
  exerciseName: PropTypes.string.isRequired,
  summary: PropTypes.string,
  intensity: PropTypes.string,
  label: PropTypes.string,
};

StudentIntensityBand.defaultProps = {
  summary: null,
  intensity: null,
  label: null,
};

export default StudentIntensityBand;
