const STEPS = ['Processing', 'In Transit', 'Delivered'];

const stepColors = {
  active:   '#4f46e5',
  done:     '#4f46e5',
  upcoming: '#d1d5db',
};

export default function OrderStepper({ status }) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <div style={styles.wrapper}>
      {STEPS.map((step, i) => {
        const isDone   = i < currentIndex;
        const isActive = i === currentIndex;
        const color    = isActive || isDone ? stepColors.done : stepColors.upcoming;

        return (
          <div key={step} style={styles.stepRow}>
            <div style={styles.stepCol}>
              <div style={{ ...styles.circle, borderColor: color, background: isActive || isDone ? color : '#fff' }}>
                {isDone ? (
                  <span style={styles.check}>✓</span>
                ) : (
                  <span style={{ ...styles.dot, background: isActive ? '#fff' : stepColors.upcoming }} />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ ...styles.line, background: isDone ? stepColors.done : stepColors.upcoming }} />
              )}
            </div>
            <span style={{ ...styles.label, color, fontWeight: isActive ? 700 : 400 }}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    minWidth: 160,
  },
  stepRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  check: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 1,
  },
  line: {
    width: 2,
    height: 24,
    margin: '2px 0',
  },
  label: {
    fontSize: 13,
    paddingTop: 2,
    lineHeight: '22px',
  },
};
