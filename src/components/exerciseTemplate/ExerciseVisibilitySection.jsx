import PropTypes from 'prop-types';
import { Globe } from 'lucide-react';
import Toggle from '../ds/Toggle';

/** "Visibilidade" section: private by default, public needs an explicit confirmation upstream. */
const ExerciseVisibilitySection = ({ className, isPublic, onToggle }) => (
  <section className={className} aria-labelledby="exercise-visibility-heading">
    <h2 id="exercise-visibility-heading" className="editor-page__section-title type-h3">Visibilidade</h2>
    <p className="editor-page__section-hint type-caption">
      Modelos privados aparecem só para você. Tornar público permite que outros treinadores reutilizem este exercício.
    </p>

    <div className="visibility-row">
      <span className="visibility-row__icon" aria-hidden="true">
        <Globe size={20} strokeWidth={2} />
      </span>
      <div className="visibility-row__text">
        <span className="type-body-strong">Tornar público</span>
        <span className="type-caption visibility-row__hint" id="exercise-public-hint">
          Outros treinadores podem usar este exercício na biblioteca compartilhada.
        </span>
      </div>
      <Toggle
        checked={isPublic}
        onChange={onToggle}
        label="Tornar este modelo público"
        describedBy="exercise-public-hint"
      />
    </div>
  </section>
);

ExerciseVisibilitySection.propTypes = {
  className: PropTypes.string.isRequired,
  isPublic: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ExerciseVisibilitySection;
