import PropTypes from 'prop-types';
import { Search, SearchX, Users } from 'lucide-react';
import EmptyBlock from '../ds/EmptyBlock';
import AssignStudentRow from './AssignStudentRow';

const StudentList = ({ students, totalCount, selected, linkedIds, onToggle, onOpenStudents }) => {
  if (totalCount === 0) {
    return (
      <EmptyBlock
        icon={Users}
        title="Sem alunos ainda"
        description="Convide um aluno para poder enviar anamneses."
        actionLabel="Ver alunos"
        onAction={onOpenStudents}
      />
    );
  }
  if (students.length === 0) {
    return <EmptyBlock icon={SearchX} title="Nenhum aluno encontrado" description="Tente buscar por outro nome ou e-mail." />;
  }
  return (
    <div className="assign-students__list">
      {students.map((student) => (
        <AssignStudentRow
          key={student.id}
          student={student}
          checked={selected.has(student.id)}
          linked={linkedIds.has(student.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};

StudentList.propTypes = {
  students: PropTypes.array.isRequired,
  totalCount: PropTypes.number.isRequired,
  selected: PropTypes.instanceOf(Set).isRequired,
  linkedIds: PropTypes.instanceOf(Set).isRequired,
  onToggle: PropTypes.func.isRequired,
  onOpenStudents: PropTypes.func.isRequired,
};

/** Student picker: search + selectable rows (already-linked students are disabled). */
const AssignStudentsPanel = ({ search, onSearchChange, ...listProps }) => (
  <div className="assign-students">
    <div className="input--search-wrap">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input
        type="search"
        className="input input--search"
        placeholder="Buscar aluno por nome ou e-mail..."
        aria-label="Buscar aluno"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
    <StudentList {...listProps} />
  </div>
);

AssignStudentsPanel.propTypes = {
  search: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
};

export default AssignStudentsPanel;
