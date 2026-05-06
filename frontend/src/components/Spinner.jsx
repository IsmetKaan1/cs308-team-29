const Spinner = ({ size = 'md', light = false, label }) => {
  const cls = ['spinner', size === 'sm' ? 'spinner--sm' : '', light ? 'spinner--light' : '']
    .filter(Boolean)
    .join(' ');

  if (label) {
    return (
      <div className="loading-block" role="status" aria-live="polite">
        <span className={cls} />
        <span>{label}</span>
      </div>
    );
  }

  return <span className={cls} role="status" aria-label="Loading" />;
};

export default Spinner;
