import { Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useSpeechPrompt } from "../../audio/useSpeechPrompt";
import { Button, s } from "../../../practice/practice-ui";
function contentObject(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
export function promptAudioText(content: unknown, fallback: string) {
  const data = contentObject(content);
  return typeof data.transcript === "string" ? data.transcript.replace(/_+/g, "…") : typeof data.suggestedPhrase === "string" ? data.suggestedPhrase : fallback;
}
export function LessonAudioPrompt({ content, prompt }: { content: unknown; prompt: string }) {
  const data = contentObject(content);
  const source = typeof data.audioUrl === "string" ? data.audioUrl : null;
  const player = useAudioPlayer(source), status = useAudioPlayerStatus(player);
  const { speak, stop, isSpeaking } = useSpeechPrompt();
  return <View style={{ marginVertical: 10 }}>
    <Button label={status.playing || isSpeaking ? "Pause audio" : "Listen to prompt"} onPress={() => {
      if (source) { if (status.playing) player.pause(); else { if (status.didJustFinish) void player.seekTo(0); player.play(); } }
      else if (isSpeaking) stop(); else speak(promptAudioText(content, prompt));
    }} />
    {!source && <Text style={s.caption}>This lesson provides a text prompt. Playback uses your installed device voice.</Text>}
  </View>;
}
