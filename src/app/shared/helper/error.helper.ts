export function extractErrorMessage(err: unknown, fallback = 'حدث خطأ أثناء تنفيذ العملية'): string {
  if (err && typeof err === 'object') {
    const status = (err as { status?: number }).status;
    
    // Check specific HTTP status codes if present
    if (status === 0) {
      return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والتحقق من عمل الخادم.';
    }
    if (status === 401) {
      return 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول.';
    }
    if (status === 403) {
      return 'عفواً، لا تملك الصلاحيات الكافية لتنفيذ هذا الإجراء.';
    }
    if (status === 404) {
      return 'العنصر المطلوب غير موجود أو تم حذفه.';
    }
    if (status === 429) {
      return 'تم إرسال عدد كبير من الطلبات، يرجى الانتظار دقيقة ثم المحاولة مجدداً.';
    }

    if ('error' in err) {
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

    if (status === 500) {
      return 'حدث خطأ غير متوقع في الخادم، يرجى المحاولة لاحقاً.';
    }
  }
  return fallback;
}
