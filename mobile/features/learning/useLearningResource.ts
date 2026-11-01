import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useLearningResource<T>(resourceId: string, load: (id: string) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load(resourceId));
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : "Could not load this learning content.");
    } finally {
      setLoading(false);
    }
  }, [load, resourceId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  return { data, loading, error, refresh };
}
