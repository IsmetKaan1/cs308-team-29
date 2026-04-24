import { useNavigate } from 'react-router-dom';

const ProfileIcon = () => {
  const navigate = useNavigate();

  return (
    <button
      className="icon-btn"
      onClick={() => navigate('/settings')}
      aria-label="Profil ayarları"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </button>
  );
};

export default ProfileIcon;
