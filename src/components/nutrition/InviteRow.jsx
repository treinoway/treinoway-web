import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import RowMenu from '../RowMenu';
import { countLabel } from '../../utils/nutritionFormat';

const EXPIRY_FORMAT = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' });

// Expiry timestamp as DD/MM/YYYY in the Sao Paulo calendar day.
const formatExpiry = (value) => (value ? EXPIRY_FORMAT.format(new Date(value)) : '-');

// One open invite (pending or declined): e-mail, send count, expiry and the row menu (resend / revoke).
const InviteRow = ({ invite, onResend, onRevoke }) => (
  <tr>
    <td>
      <div className="patient-row__text">
        <span className="patient-row__name type-h4">{invite.email}</span>
        {invite.status === 'declined' && <Badge tone="warning">Recusado</Badge>}
        <span className="patient-row__meta type-caption">
          {invite.status === 'declined'
            ? countLabel(invite.sendCount, 'envio', 'envios')
            : `${countLabel(invite.sendCount, 'envio', 'envios')} · expira em ${formatExpiry(invite.expiresAt)}`}
        </span>
      </div>
    </td>
    <td>
      <RowMenu
        ariaLabel={`Ações do convite ${invite.email}`}
        extraItems={[{ label: 'Reenviar convite', onClick: () => onResend(invite), disabled: invite.status !== 'declined' && invite.canResend === false }]}
        onDelete={() => onRevoke(invite)}
        deleteLabel="Revogar convite"
      />
    </td>
  </tr>
);

InviteRow.propTypes = {
  invite: PropTypes.object.isRequired,
  onResend: PropTypes.func.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

export default InviteRow;
