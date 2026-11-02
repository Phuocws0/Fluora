import { useLocalSearchParams } from "expo-router";
import { ContentState } from "../../../components/ContentState";
import RoomScreen from "../../../features/community/RoomScreen";
export default function Route() {
  const params = useLocalSearchParams<{ roomId: string | string[] }>();
  const roomId = Array.isArray(params.roomId)
    ? params.roomId[0]
    : params.roomId;
  if (!roomId)
    return (
      <ContentState
        title="Invalid destination"
        message="Return to League and open this item again."
      />
    );
  return <RoomScreen key={roomId} roomId={roomId} />;
}
