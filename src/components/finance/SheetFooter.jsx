import PropTypes from 'prop-types';
import { t } from '../../i18n';

/**
 * Footer of the finance sheets (DS Modal footer): Cancel + the primary submit,
 * which targets the sheet's form by id. Both disable while submitting and the
 * submit label switches to "Carregando...".
 */
const SheetFooter = ({ formId, submitting, submitLabel, onCancel }) => (
  <>
    <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>
      {t('finance.cancel')}
    </button>
    <button type="submit" form={formId} className="btn btn--primary" disabled={submitting}>
      {submitting ? t('finance.loading') : submitLabel}
    </button>
  </>
);

SheetFooter.propTypes = {
  formId: PropTypes.string.isRequired,
  submitting: PropTypes.bool.isRequired,
  submitLabel: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default SheetFooter;
