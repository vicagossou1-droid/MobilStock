export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}

export function logDevError(scope: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${scope}]`, error);
  }
}
