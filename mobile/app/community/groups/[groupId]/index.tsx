import { useLocalSearchParams } from "expo-router";
import { ContentState } from "../../../../components/ContentState";
import GroupScreen from "../../../../features/community/GroupScreen";
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
  return <GroupScreen key={groupId} groupId={groupId} />;
}
