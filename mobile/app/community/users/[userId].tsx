import { useLocalSearchParams } from "expo-router";
import { ContentState } from "../../../components/ContentState";
import { FriendProfileScreen } from "../../../features/community/FriendsScreen";
export default function Route() {
  const params = useLocalSearchParams<{ userId: string | string[] }>();
  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;
  if (!userId)
    return (
      <ContentState
        title="Invalid destination"
        message="Return to League and open this item again."
      />
    );
  return <FriendProfileScreen key={userId} userId={userId} />;
}
