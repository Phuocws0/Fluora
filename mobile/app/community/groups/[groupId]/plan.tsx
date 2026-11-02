import { useLocalSearchParams } from "expo-router";
import { ContentState } from "../../../../components/ContentState";
import BoardScreen from "../../../../features/community/BoardScreen";
export default function Route() {
  const params = useLocalSearchParams<{ groupId: string | string[] }>();
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  if (!groupId)
    return (
      <ContentState
        title="Invalid destination"
        message="Return to League and open this item again."
      />
    );
  return <BoardScreen key={groupId} groupId={groupId} />;
}
