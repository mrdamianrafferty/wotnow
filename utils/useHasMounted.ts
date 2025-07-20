import { useEffect, useState } from 'react';

/**
 * Returns true only on the client, after the component has mounted.
 */
export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
}
