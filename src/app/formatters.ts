export function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

export function formatDate(rawValue: string | null) {
  if (!rawValue) {
    return 'n/a';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(rawValue));
}
