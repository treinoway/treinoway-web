import PropTypes from 'prop-types';
import Badge from '../ds/Badge';

const ImportStatusBadge = ({ student }) => {
  if (student.duplicateEmail) return <Badge tone="error">Duplicado</Badge>;
  if (student.status === 'ATIVO' || student.status === 'Entregue') return <Badge tone="success">Ativo</Badge>;
  return <Badge tone="warning">Pendente</Badge>;
};

ImportStatusBadge.propTypes = { student: PropTypes.object.isRequired };

const ImportPreviewTable = ({ students, selectedEmails, onToggleStudent, onToggleAll }) => {
  const selectable = students.filter((s) => !s.duplicateEmail && s.email);
  const allSelected = selectable.length > 0 && selectable.every((s) => selectedEmails.has(s.email));

  return (
    <div className="import-table-wrap">
      <table className="import-table">
        <thead>
          <tr>
            <th className="import-table__check">
              <input type="checkbox" aria-label="Selecionar todos" checked={allSelected} onChange={onToggleAll} />
            </th>
            <th className="type-caption-strong">Nome</th>
            <th className="type-caption-strong table-col-desktop-only">E-mail</th>
            <th className="type-caption-strong table-col-desktop-only">Plano</th>
            <th className="type-caption-strong">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => (
            <tr key={student.email || i}>
              <td className="import-table__check">
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${student.fullName || student.email}`}
                  checked={!!student.email && selectedEmails.has(student.email)}
                  onChange={() => onToggleStudent(student.email)}
                  disabled={student.duplicateEmail || !student.email}
                />
              </td>
              <td className="type-body-strong">
                {student.fullName}
                <span className="table-col-mobile-only type-caption import-table__sub">{student.email || '—'}</span>
              </td>
              <td className="type-body table-col-desktop-only">{student.email || '—'}</td>
              <td className="type-body table-col-desktop-only">{student.plan || '—'}</td>
              <td><ImportStatusBadge student={student} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ImportPreviewTable.propTypes = {
  students: PropTypes.arrayOf(
    PropTypes.shape({
      fullName: PropTypes.string,
      email: PropTypes.string,
      plan: PropTypes.string,
      status: PropTypes.string,
      duplicateEmail: PropTypes.bool,
    })
  ).isRequired,
  selectedEmails: PropTypes.instanceOf(Set).isRequired,
  onToggleStudent: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
};

export default ImportPreviewTable;
