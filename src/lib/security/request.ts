export function rejectCrossOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    if (new URL(origin).origin === new URL(request.url).origin) return null;
  } catch {
    // Invalid origins are rejected below.
  }

  return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
}

export function exceedsContentLength(request: Request, maximumBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return Number.isFinite(length) && length > maximumBytes;
}
