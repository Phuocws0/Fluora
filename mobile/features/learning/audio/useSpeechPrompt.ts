import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

export function useSpeechPrompt() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const speak = useCallback((text: string, options?: { language?: string; rate?: number; pauseMs?: number }) => {
    const run = ++generation.current;
    clearTimer();
    const segments = options?.pauseMs ? text.split(/(?<=[.!?])\s+/).filter(Boolean) : [text];
    setIsSpeaking(true);
    const play = (index: number) => {
      if (run !== generation.current) return;
      if (!segments[index]) { setIsSpeaking(false); return; }
      Speech.speak(segments[index], {
        language: options?.language ?? "en", rate: options?.rate ?? 0.9,
        onDone: () => {
          if (run !== generation.current) return;
          if (index + 1 < segments.length) timer.current = setTimeout(() => play(index + 1), options?.pauseMs ?? 0);
          else setIsSpeaking(false);
        },
        onStopped: () => { if (run === generation.current) setIsSpeaking(false); },
        onError: () => { if (run === generation.current) setIsSpeaking(false); },
      });
    };
    void Speech.stop().then(() => play(0)).catch(() => { if (run === generation.current) setIsSpeaking(false); });
  }, []);
  const stop = useCallback(() => {
    generation.current++; clearTimer(); void Speech.stop(); setIsSpeaking(false);
  }, []);
  useEffect(() => () => { generation.current++; clearTimer(); void Speech.stop(); }, []);
  return { speak, stop, isSpeaking };
}
