import { useLocalSearchParams } from "expo-router";
import { ContentState } from "../../../../../components/ContentState";
import DiscussionScreen from "../../../../../features/community/PostFeed";
export default function Route() {
  const params = useLocalSearchParams<{
    groupId: string | string[];
    postId: string | string[];
  }>();
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  const postId = Array.isArray(params.postId)
    ? params.postId[0]
    : params.postId;
  if (!groupId || !postId)
    return (
      <ContentState
        title="Invalid destination"
        message="Return to League and open this item again."
      />
    );
  return (
    <DiscussionScreen
      key={groupId + "/" + postId}
      groupId={groupId}
      postId={postId}
    />
  );
}
