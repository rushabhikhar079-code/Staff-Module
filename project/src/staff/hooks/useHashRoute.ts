import { useEffect, useState } from 'react';

export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const [pathPart, query = ''] = hash.replace(/^#/, '').split('?');
  return {
    pathname: pathPart || '/staff',
    params: new URLSearchParams(query),
  };
}

export function navigateTo(path: string, params?: Record<string, string>): void {
  const query = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : '';
  window.location.hash = `${path}${query}`;
}
