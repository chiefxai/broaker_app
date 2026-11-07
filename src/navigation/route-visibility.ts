const primaryTabPaths = new Set(['/', '/explore', '/shared-links', '/settings']);

export function shouldShowAppNavigation(pathname: string): boolean {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return primaryTabPaths.has(normalizedPath);
}

export function requiresBrokerAuthentication(pathname: string): boolean {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return !normalizedPath.startsWith('/share/')
    && !normalizedPath.startsWith('/p/')
    && !normalizedPath.startsWith('/broker/');
}
