import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: null, loading: true });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    loader()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            data: undefined,
            error: err instanceof Error ? err.message : 'Records could not be loaded.',
            loading: false,
          });
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, reload };
}
