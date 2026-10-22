import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import Segmented from '../ds/Segmented';
import AnamnesisPreviewModal from '../AnamnesisPreviewModal';
import AssignStudentsPanel from './AssignStudentsPanel';
import AssignTemplateCard from './AssignTemplateCard';
import AssignFooter from './AssignFooter';
import useAssignSubmit from '../../hooks/useAssignSubmit';
import { getStudentDisplayName } from '../../utils/studentRow';

const TABS = [
  { id: 'students', label: 'Alunos', domId: 'assign-tab-students', controls: 'assign-panel-students' },
  { id: 'config', label: 'Anamnese', domId: 'assign-tab-config', controls: 'assign-panel-config' },
];

const filterStudents = (students, search) => {
  const query = search.trim().toLowerCase();
  if (!query) return students;
  return students.filter((student) =>
    getStudentDisplayName(student).toLowerCase().includes(query)
    || (student.email ?? '').toLowerCase().includes(query));
};

const toggleInSet = (set, id) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/** Picker + summary + footer of the assign screen, once the data is loaded. */
const AssignWorkspace = ({ anamnesis, students, linkedIds, onBack }) => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const { submitting, handleSubmit } = useAssignSubmit({ anamnesisId: anamnesis.id, selected, onDone: onBack });
  const visibleStudents = useMemo(() => filterStudents(students, search), [students, search]);
  const panelClass = (id) => `assign-panel${activeTab === id ? ' assign-panel--active' : ''}`;

  const handleToggle = (id) => {
    if (!linkedIds.has(id)) setSelected((prev) => toggleInSet(prev, id));
  };

  return (
    <>
      <div className="assign-tabs">
        <Segmented ariaLabel="Seções da tela" items={TABS} value={activeTab} onChange={setActiveTab} />
      </div>
      <div className="assign-body">
        <section id="assign-panel-students" role="tabpanel" aria-labelledby="assign-tab-students" className={`section-card ${panelClass('students')}`}>
          <AssignStudentsPanel
            search={search}
            onSearchChange={setSearch}
            students={visibleStudents}
            totalCount={students.length}
            selected={selected}
            linkedIds={linkedIds}
            onToggle={handleToggle}
            onOpenStudents={() => navigate('/trainer/students')}
          />
        </section>
        <section id="assign-panel-config" role="tabpanel" aria-labelledby="assign-tab-config" className={`section-card ${panelClass('config')}`}>
          <AssignTemplateCard anamnesis={anamnesis} onPreview={() => setPreviewOpen(true)} />
        </section>
      </div>
      <AssignFooter selectedCount={selected.size} submitting={submitting} onCancel={onBack} onSubmit={handleSubmit} />
      {previewOpen && (
        <AnamnesisPreviewModal anamnesis={anamnesis} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
};

AssignWorkspace.propTypes = {
  anamnesis: PropTypes.object.isRequired,
  students: PropTypes.array.isRequired,
  linkedIds: PropTypes.instanceOf(Set).isRequired,
  onBack: PropTypes.func.isRequired,
};

export default AssignWorkspace;
