import { useId, useRef } from 'react';
import PropTypes from 'prop-types';
import { User } from 'lucide-react';
import { t } from '../i18n';

// Round profile picture: the uploaded image, or the user's initials as fallback.
export const ProfileAvatar = ({ avatarUrl, initials }) => {
  if (avatarUrl) {
    return <img className="profile-avatar profile-avatar--image" src={avatarUrl} alt={t('profile.avatar.label')} />;
  }
  return <div className="profile-avatar">{initials}</div>;
};

ProfileAvatar.propTypes = {
  avatarUrl: PropTypes.string,
  initials: PropTypes.string.isRequired,
};

// Edit-mode avatar picker: preview plus a button that opens the hidden file input.
const ProfileAvatarField = ({ avatarUrl, uploading, invalid, onSelect }) => {
  const inputRef = useRef(null);
  const errorId = useId();

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onSelect(file);
  };

  return (
    <div className="profile-avatar-field">
      {avatarUrl ? (
        <ProfileAvatar avatarUrl={avatarUrl} initials="" />
      ) : (
        <div className="profile-avatar" aria-hidden="true">
          <User size={32} strokeWidth={2} />
        </div>
      )}
      <div className="profile-avatar-field-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={uploading}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={invalid ? errorId : undefined}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? t('profile.avatar.uploading') : t('profile.avatar.change')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="visually-hidden"
          tabIndex={-1}
          aria-label={t('profile.avatar.label')}
          aria-invalid={invalid ? 'true' : undefined}
          disabled={uploading}
          onChange={handleChange}
        />
        {invalid && <span id={errorId} className="form-error">{t('profile.avatar.required')}</span>}
      </div>
    </div>
  );
};

ProfileAvatarField.propTypes = {
  avatarUrl: PropTypes.string,
  uploading: PropTypes.bool,
  invalid: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

export default ProfileAvatarField;
