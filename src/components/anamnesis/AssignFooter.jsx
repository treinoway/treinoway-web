import PropTypes from 'prop-types';

const pluralize = (count, singular, plural) => (count === 1 ? singular : plural);

/** Sticky action bar: selection counter, cancel and the primary "Enviar" action. */
const AssignFooter = ({ selectedCount, submitting, onCancel, onSubmit }) => (
  <div className="assign-footer section-card">
    <span className="assign-footer__counter type-body-strong" role="status">
      {selectedCount > 0 && `${selectedCount} ${pluralize(selectedCount, 'aluno selecionado', 'alunos selecionados')}`}
    </span>
    <div className="ds-actions">
      <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>
        Cancelar
      </button>
      <button type="button" className="btn btn--primary" onClick={onSubmit} disabled={selectedCount === 0 || submitting}>
        {submitting
          ? 'Enviando…'
          : `Enviar para ${selectedCount} ${pluralize(selectedCount, 'aluno', 'alunos')}`}
      </button>
    </div>
  </div>
);

AssignFooter.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  submitting: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default AssignFooter;
