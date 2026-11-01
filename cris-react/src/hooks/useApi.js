import { useCallback, useEffect, useRef, useState } from "react";

/* One hook for every "load this from the API" case.
   Returns { data, loading, error, reload } so pages can render
   three states without repeating the same boilerplate. */
export function useApi(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setState((prev) => ({ data: prev.data, loading: true, error: null }));

    loaderRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error });
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}

/* document.title is still how a SPA announces the page */
export function useTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · Cris Fu` : "Cris Fu · Portfolio & Blog";
    return () => {
      document.title = previous;
    };
  }, [title]);
}
