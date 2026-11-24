import PropTypes from 'prop-types';
import { Trophy } from 'lucide-react';

const TOP_3_LIMIT = 3;
const PINNED_THRESHOLD = 10;

const getEntryDisplayName = ({ entry, anonymous, ownStudentId }) => {
  if (anonymous && entry.studentId !== ownStudentId) {
    return `Aluno #${entry.position}`;
  }
  const full = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
  return full || 'Aluno';
};

const getInitials = (entry) => {
  const full = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
  return (full[0] || '?').toUpperCase();
};

const TOP_MEDAL_COLORS = ['#f0b400', '#a0a0a0', '#cd7f32'];

const RankingRow = ({ entry, isMe, anonymous, ownStudentId, isTopThree, onRowTap }) => {
  const name = getEntryDisplayName({ entry, anonymous, ownStudentId });
  const hideAvatar = anonymous && !isMe;
  const medalColor = isTopThree ? TOP_MEDAL_COLORS[entry.position - 1] : null;

  const handleClick = () => {
    if (onRowTap) onRowTap(entry);
  };

  return (
    <li
      className={`ranking-row${isMe ? ' ranking-row--me' : ''}${isTopThree ? ' ranking-row--top3' : ''}${onRowTap ? ' ranking-row--tappable' : ''}`}
      onClick={handleClick}
      role={onRowTap ? 'button' : undefined}
      tabIndex={onRowTap ? 0 : undefined}
      onKeyDown={onRowTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } } : undefined}
    >
      <span className="ranking-position">
        {medalColor ? (
          <Trophy size={16} strokeWidth={2} style={{ color: medalColor }} aria-hidden="true" />
        ) : null}
        {' '}#{entry.position}
      </span>
      <div className="ranking-avatar" aria-hidden="true">
        {hideAvatar || !entry.avatarUrl
          ? getInitials(entry)
          : <img src={entry.avatarUrl} alt="" />}
      </div>
      <span className="ranking-name">{name}</span>
      <span className="ranking-points">{entry.points} pts</span>
    </li>
  );
};

RankingRow.propTypes = {
  entry: PropTypes.object.isRequired,
  isMe: PropTypes.bool,
  anonymous: PropTypes.bool,
  ownStudentId: PropTypes.string,
  isTopThree: PropTypes.bool,
  onRowTap: PropTypes.func,
};

// Points ranking rows; `showPodium` false drops the top-3 medals (the weekly championship's Pontos view has no podium)
const RankingList = ({ entries, ownStudentId = null, anonymous = false, onRowTap = null, showPodium = true }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhum aluno no ranking ainda.</p>
      </div>
    );
  }

  const myEntry = ownStudentId ? entries.find((e) => e.studentId === ownStudentId) : null;
  const shouldPinOwn = myEntry && myEntry.position > PINNED_THRESHOLD;

  return (
    <div className="ranking-list-container">
      <ul className="ranking-list" aria-label="Ranking">
        {entries.map((entry) => {
          const isMe = ownStudentId && entry.studentId === ownStudentId;
          const isTopThree = showPodium && entry.position <= TOP_3_LIMIT;
          return (
            <RankingRow
              key={entry.studentId}
              entry={entry}
              isMe={isMe}
              anonymous={anonymous}
              ownStudentId={ownStudentId}
              isTopThree={isTopThree}
              onRowTap={onRowTap}
            />
          );
        })}
      </ul>

      {shouldPinOwn && (
        <div className="ranking-pinned-row" aria-label="Sua posição">
          <ul className="ranking-list">
            <RankingRow
              entry={myEntry}
              isMe
              anonymous={anonymous}
              ownStudentId={ownStudentId}
              isTopThree={false}
              onRowTap={onRowTap}
            />
          </ul>
        </div>
      )}
    </div>
  );
};

RankingList.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.shape({
    position: PropTypes.number.isRequired,
    studentId: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    avatarUrl: PropTypes.string,
    points: PropTypes.number.isRequired,
  })).isRequired,
  ownStudentId: PropTypes.string,
  anonymous: PropTypes.bool,
  onRowTap: PropTypes.func,
  showPodium: PropTypes.bool,
};

export default RankingList;
