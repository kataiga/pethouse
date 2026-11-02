/** A request body as the fake servers read it: any JSON object, field by field. */
export type Fields = Record<string, unknown>;

export function fieldsOf (body: unknown): Fields {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? Object.fromEntries(Object.entries(body))
    : {};
}

export function json (status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function error (status: number, message: string): Response {
  return json(status, {
    statusCode: status,
    message,
  });
}

export function text (value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function number (value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}
