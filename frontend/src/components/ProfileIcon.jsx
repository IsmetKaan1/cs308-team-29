import { useNavigate } from 'react-router-dom';

const ProfileIcon = () => {
  const navigate = useNavigate();

  return (
    <button
      style={styles.button}
      onClick={() => navigate('/settings')}
      aria-label="Profile settings"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </button>
  );
};

const styles = {
  button: {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
};

export default ProfileIcon;
