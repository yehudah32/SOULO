export function isAdminAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/admin_authed=([^;]+)/);
  const token = match?.[1];
  return !!token && token === process.env.ADMIN_PASSWORD;
}
