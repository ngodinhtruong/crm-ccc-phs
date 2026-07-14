import {
  DEFAULT_OUTCOME_STYLE,
  OUTCOME_STYLES,
} from "@/constants/chatbot-dashboard.constant";

export function StatusPill({
  value,
  label,
}: {
  value?: string | null;
  label?: string | null;
}) {
  const style = OUTCOME_STYLES[value || ""] || DEFAULT_OUTCOME_STYLE;

  return (
    <span
      className={`rounded-full px-2 py-1 font-semibold whitespace-nowrap ${style.pill}`}
    >
      {label || value || "-"}
    </span>
  );
}
