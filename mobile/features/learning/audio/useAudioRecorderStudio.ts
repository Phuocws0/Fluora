import { useCallback, useEffect, useRef, useState } from "react";
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  type RecordingStatus,
} from "expo-audio";

export type RecorderStudioState = {
  isRecording: boolean;
  recordingUri: string | null;
  meteringLevel: number; // 0.0 to 1.0
  permissionGranted: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  resetRecording: () => void;
};

export function useAudioRecorderStudio(): RecorderStudioState {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [meteringLevel, setMeteringLevel] = useState(0.1);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY,
    (status: RecordingStatus) => {
      setIsRecording(!status.isFinished);
      if (status.url) {
        setRecordingUri(status.url);
      }
    },
  );

  useEffect(() => {
    void getRecordingPermissionsAsync().then((res) => {
      setPermissionGranted(res.granted);
    });
  }, []);

  const startMetering = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      // Generate natural dynamic oscillation between 0.2 and 0.95 during active speech
      const jitter = 0.3 + Math.random() * 0.65;
      setMeteringLevel(jitter);
    }, 100);
  };

  const stopMetering = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setMeteringLevel(0.1);
  };

  const startRecording = useCallback(async () => {
    let granted = permissionGranted;
    if (!granted) {
      const resp = await requestRecordingPermissionsAsync();
      granted = resp.granted;
      setPermissionGranted(granted);
    }
    if (!granted) {
      throw new Error("Microphone permission was denied.");
    }

    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
    startMetering();
  }, [permissionGranted, recorder]);

  const stopRecording = useCallback(async () => {
    stopMetering();
    await recorder.stop();
    setIsRecording(false);
    const uri = recorder.uri;
    setRecordingUri(uri);
    return uri;
  }, [recorder]);

  const resetRecording = useCallback(() => {
    stopMetering();
    setIsRecording(false);
    setRecordingUri(null);
  }, []);

  useEffect(() => {
    return () => {
      stopMetering();
    };
  }, []);

  return {
    isRecording,
    recordingUri,
    meteringLevel,
    permissionGranted,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
