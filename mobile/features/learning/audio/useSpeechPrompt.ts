import { useCallback, useEffect, useState } from "react";
import * as Speech from "expo-speech";

export function useSpeechPrompt() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string, options?: { language?: string; rate?: number }) => {
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(text, {
      language: options?.language ?? "en",
      rate: options?.rate ?? 0.9,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  return { speak, stop, isSpeaking };
}
