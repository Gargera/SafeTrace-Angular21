type ErrorRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ErrorRecord =>
  typeof value === 'object' && value !== null;

const nonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const message = value.trim();
  return message || null;
};

const validationMessages = (value: unknown): string[] => {
  if (!isRecord(value)) return [];

  return Object.values(value).flatMap((messages) => {
    if (Array.isArray(messages)) {
      return messages
        .map(nonEmptyString)
        .filter((message): message is string => message !== null);
    }

    const message = nonEmptyString(messages);
    return message ? [message] : [];
  });
};

export function extractErrorMessage(
  error: unknown,
  fallback = 'حدث خطأ أثناء تنفيذ العملية.',
): string {
  if (typeof error === 'string') {
    return nonEmptyString(error) ?? fallback;
  }

  if (!isRecord(error)) return fallback;

  const responseBody = error['error'];

  if (isRecord(responseBody)) {
    const detail = nonEmptyString(responseBody['detail']);
    if (detail) return detail;

    const errors = validationMessages(responseBody['errors']);
    if (errors.length) return errors.join(' - ');

    const message = nonEmptyString(responseBody['message']);
    if (message) return message;

    const title = nonEmptyString(responseBody['title']);
    if (title) return title;
  }

  const plainBody = nonEmptyString(responseBody);
  if (plainBody) return plainBody;

  const topLevelMessage = nonEmptyString(error['message']);
  if (topLevelMessage) return topLevelMessage;

  switch (error['status']) {
    case 0:
      return 'تعذر الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت واعادة المحاولة.';
    case 401:
      return 'انتهت صلاحية الجلسة. يرجى إعادة تسجيل الدخول.';
    case 403:
      return 'عفوًا، لا تملك الصلاحية الكافية لتنفيذ هذا الإجراء.';
    case 404:
      return 'العنصر المطلوب غير موجود أو تم حذفه.';
    case 408:
      return 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.';
    case 409:
      return 'تعذر تنفيذ العملية بسبب تعارض في البيانات. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
    case 422:
      return 'البيانات المرسلة غير صالحة. يرجى مراجعتها والمحاولة مرة أخرى.';
    case 429:
      return 'تم إرسال عدد كبير من الطلبات. يرجى الانتظار قليلًا ثم المحاولة مجددًا.';
    default:
      return typeof error['status'] === 'number' && error['status'] >= 500
        ? 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقًا.'
        : fallback;
  }
}
