const Stars = ({ value = 0, size = 'md' }) => {
  const rounded = Math.round(Number(value) || 0);
  const cls = ['stars', size === 'lg' ? 'stars--lg' : size === 'xl' ? 'stars--xl' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls} aria-label={`${Number(value).toFixed(1)} yıldız`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? 'star-filled' : 'star'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
};

export default Stars;
