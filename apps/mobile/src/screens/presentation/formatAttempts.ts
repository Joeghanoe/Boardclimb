export function formatAttempts(count: number): string {
  return count === 1 ? '1 attempt' : `${count} attempts`;
}
