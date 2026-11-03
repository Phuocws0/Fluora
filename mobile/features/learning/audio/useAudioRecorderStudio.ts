import { useCallback, useEffect, useState } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

export function useAudioRecorderStudio() {
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 100);

  const startRecording = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error("Microphone permission was denied.");
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecordingUri(null);
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    await recorder.stop();
    const uri = recorder.uri;
    setRecordingUri(uri);
    await setAudioModeAsync({ allowsRecording: false });
    return uri;
  }, [recorder]);

  useEffect(() => () => {
    // The recorder hook releases its native resource on unmount; restore playback mode too.
    void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
  }, []);

  return {
    isRecording: state.isRecording,
    recordingUri,
    meteringLevel: state.isRecording && state.metering !== undefined
      ? Math.max(0, Math.min(1, Math.pow(10, state.metering / 20)))
      : 0,
    startRecording,
    stopRecording,
  };
}
