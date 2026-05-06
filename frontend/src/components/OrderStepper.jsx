const STEPS = ['Processing', 'In Transit', 'Delivered'];
const LABELS_TR = {
  Processing: 'Hazırlanıyor',
  'In Transit': 'Kargoda',
  Delivered: 'Teslim Edildi',
};

export default function OrderStepper({ status }) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="stepper" role="list" aria-label="Sipariş durumu">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const state = isDone ? 'is-done' : isActive ? 'is-active' : '';

        return (
          <div className="stepper-row" key={step} role="listitem">
            <div className="stepper-col">
              <div className={`stepper-circle ${state}`.trim()}>
                {isDone ? (
                  <span className="stepper-check" aria-hidden="true">✓</span>
                ) : (
                  <span className="stepper-dot" aria-hidden="true" />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`stepper-line ${isDone ? 'is-done' : ''}`.trim()} />
              )}
            </div>
            <span className={`stepper-label ${state}`.trim()}>
              {LABELS_TR[step] || step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
