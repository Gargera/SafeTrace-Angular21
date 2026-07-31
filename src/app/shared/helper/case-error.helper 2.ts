export function extractErrorMessage(err: unknown, fallback = 'حدث خطأ أثناء تنفيذ العملية'): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const errorObj = (err as { error: unknown }).error;
    if (errorObj && typeof errorObj === 'object') {
      if ('errors' in errorObj && errorObj.errors && typeof errorObj.errors === 'object') {
        const messages: string[] = [];
        Object.values(errorObj.errors as Record<string, unknown>).forEach((val) => {
          if (Array.isArray(val)) {
            messages.push(...val.map(String));
          } else if (typeof val === 'string') {
            messages.push(val);
          }
        });
        if (messages.length > 0) {
          return messages.join(' - ');
        }
      }
      if ('detail' in errorObj && typeof errorObj.detail === 'string' && errorObj.detail) {
        return errorObj.detail;
      }
      if ('message' in errorObj && typeof errorObj.message === 'string' && errorObj.message) {
        return errorObj.message;
      }
    } else if (typeof errorObj === 'string' && errorObj) {
      return errorObj;
    }
  }
  return fallback;
}
