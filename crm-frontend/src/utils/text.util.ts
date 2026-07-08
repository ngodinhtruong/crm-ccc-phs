export function shortText(value?: string | null, max = 80) {
  if (!value) return "-";

  if (value.length <= max) return value;

  return `${value.slice(0, max)}...`;
}