import { useState } from 'react';
import PropTypes from 'prop-types';
import { Plus, Users } from 'lucide-react';
import Avatar from '../ds/Avatar';
import ConfirmDialog from '../ds/ConfirmDialog';
import EmptyBlock from '../ds/EmptyBlock';
import Modal from '../ds/Modal';
import SkeletonRows from '../ds/SkeletonRows';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';

const SKELETON_COUNT = 6;

// Full name of a participant or student, falling back to the e-mail
const nameOf = (person) => `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email || 'Aluno';

// "1 aluno" / "N alunos"
const studentsOf = (count) => `${count} ${count === 1 ? 'aluno' : 'alunos'}`;

// "Entrou em DD/MM/AAAA · N pts" of a participant
const entryLineOf = (participant, points) => `Entrou em ${formatDateTimeForDisplay(participant.addedAt)} · ${points ?? 0} pts`;

// One participant: avatar, name, entry date with points and "Remover" while the championship can change
const ParticipantRow = ({ participant, points, onRemove }) => (
  <li className="challenge-participant">
    <Avatar name={nameOf(participant)} src={participant.avatarUrl || undefined} />
    <div className="challenge-participant__identity">
      <span className="type-body-strong">{nameOf(participant)}</span>
      <span className="challenge-participant__meta type-caption">{entryLineOf(participant, points)}</span>
    </div>
    {onRemove && <button type="button" className="btn btn--ghost" aria-label={`Remover ${nameOf(participant)}`} onClick={() => onRemove(participant)}>Remover</button>}
  </li>
);

ParticipantRow.propTypes = {
  participant: PropTypes.object.isRequired,
  points: PropTypes.number,
  onRemove: PropTypes.func,
};

// "Adicionar participantes" sheet: the trainer students not in the championship, as checkboxes
const AddParticipantsModal = ({ students, onAdd, onClose }) => {
  const [selected, setSelected] = useState([]);
  const [adding, setAdding] = useState(false);
  const toggle = (studentId) => setSelected((ids) => (ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]));
  const handleAdd = async () => {
    setAdding(true);
    const added = await onAdd(selected);
    setAdding(false);
    if (added) onClose();
  };
  const footer = (
    <div className="ds-actions challenge-participants__footer">
      <button type="button" className="btn btn--secondary" disabled={adding} onClick={onClose}>Cancelar</button>
      <button type="button" className="btn btn--primary" disabled={adding || selected.length === 0} onClick={handleAdd}>{adding ? 'Carregando...' : 'Adicionar'}</button>
    </div>
  );
  return (
    <Modal title="Adicionar participantes" onClose={() => !adding && onClose()} closeDisabled={adding} footer={footer}>
      {students.length === 0 ? <p className="type-body">Todos os seus alunos já estão neste campeonato.</p> : (
        <div className="checkbox-list">
          {students.map((student) => (
            <label key={student.id} className="checkbox-row">
              <input type="checkbox" checked={selected.includes(student.id)} disabled={adding} onChange={() => toggle(student.id)} />
              {nameOf(student)}
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
};

AddParticipantsModal.propTypes = {
  students: PropTypes.array.isRequired,
  onAdd: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// Participants tab: "Participantes · N alunos no campeonato", "Adicionar participantes" and one row per student with entry date, points and "Remover"
const ParticipantsTab = ({ participants, pointsByStudent = {}, loading = false, readOnly = false, students = [], onAdd, onRemove }) => {
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [addOpen, setAddOpen] = useState(false);
  if (loading) return <SkeletonRows label="Carregando participantes" count={SKELETON_COUNT} />;
  const participantIds = new Set(participants.map((participant) => participant.studentId));
  const handleRemove = readOnly ? undefined : (participant) => requestConfirm({ message: `Remover ${nameOf(participant)} do campeonato?`, confirmLabel: 'Remover', busyLabel: 'Removendo...', onConfirm: () => onRemove(participant) });
  return (
    <section className="championship-tab" aria-label="Participantes">
      <div className="championship-block__head">
        <div className="championship-block__titles">
          <span className="championship-block__eyebrow type-caption-strong">Participantes</span>
          <h2 className="championship-block__title type-h3">{`${studentsOf(participants.length)} no campeonato`}</h2>
        </div>
        {!readOnly && <button type="button" className="btn btn--primary" onClick={() => setAddOpen(true)}><Plus size={16} strokeWidth={2} aria-hidden="true" />Adicionar participantes</button>}
      </div>
      {participants.length === 0 ? <section className="section-card"><EmptyBlock icon={Users} title="Nenhum participante." /></section> : (
        <ul className="challenge-participants">
          {participants.map((participant) => <ParticipantRow key={participant.id} participant={participant} points={pointsByStudent[participant.studentId]} onRemove={handleRemove} />)}
        </ul>
      )}
      {participants.length > 0 && <p className="championship-block__count type-body">{`Mostrando ${participants.length} de ${participants.length} participantes`}</p>}
      {addOpen && <AddParticipantsModal students={students.filter((student) => !participantIds.has(student.id))} onAdd={onAdd} onClose={() => setAddOpen(false)} />}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </section>
  );
};

ParticipantsTab.propTypes = {
  participants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    studentId: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    avatarUrl: PropTypes.string,
    addedAt: PropTypes.string,
  })).isRequired,
  pointsByStudent: PropTypes.object,
  loading: PropTypes.bool,
  readOnly: PropTypes.bool,
  students: PropTypes.array,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default ParticipantsTab;
