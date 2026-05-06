const STEPS = ['processing', 'in-transit', 'delivered'];
const LABELS_TR = {
  processing: 'Hazırlanıyor',
  'in-transit': 'Kargoda',
  delivered: 'Teslim Edildi',
};
const STATUS_ALIASES = {
  Processing: 'processing',
  'In Transit': 'in-transit',
  Delivered: 'delivered',
};

export default function OrderStepper({ status }) {
  const normalizedStatus = STATUS_ALIASES[status] || status;
  const currentIndex = STEPS.indexOf(normalizedStatus);

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
