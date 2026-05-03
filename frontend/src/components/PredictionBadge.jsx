// Shows predicted fill status on each bin card
export default function PredictionBadge({ prediction }) {
  if (!prediction) return null;

  const { predicted_fill_4h, full_by, status, hours_to_full } = prediction;

  const config = {
    critical: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-300",
      icon: "🔴",
    },
    warning: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-300",
      icon: "🟠",
    },
    moderate: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "border-yellow-300",
      icon: "🟡",
    },
    safe: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-300",
      icon: "🟢",
    },
  };

  const c = config[status] || config.safe;

  return (
    <div
      className={`mt-2 px-3 py-2 rounded-lg border text-xs 
                     ${c.bg} ${c.text} ${c.border}`}
    >
      <div className="font-semibold mb-0.5">{c.icon} AI Prediction</div>
      <div>
        📈 Fill in 4h: <strong>{predicted_fill_4h}%</strong>
      </div>
      <div>
        ⏰ Full by: <strong>{full_by}</strong>
      </div>
      {hours_to_full < 99 && <div>⚡ ~{hours_to_full}h until full</div>}
    </div>
  );
}
