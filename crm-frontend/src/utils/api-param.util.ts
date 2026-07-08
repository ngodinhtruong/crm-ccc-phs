export function cleanParams<T extends Record<string, unknown>>(params: T): T {
  const result: Record<string, unknown> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  });

  return result as T;
}