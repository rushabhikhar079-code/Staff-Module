const pad = (value: number) => String(value).padStart(2, '0');

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function shiftIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year}`;
}

export function formatMoney(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function parseAmount(value: string): number {
  return Number(value.replace(/,/g, ''));
}

export function isPositiveAmount(value: string): boolean {
  const amount = parseAmount(value);
  return value.trim() !== '' && Number.isFinite(amount) && amount >= 0;
}
