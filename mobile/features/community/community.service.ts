import { deleteJson, getJson, patchJson, postJson } from "../../services/api";
import type {
  Achievement,
  BoardNote,
  Challenge,
  Cursor,
  Friend,
  FriendRequest,
  Group,
  League,
  Member,
  Notice,
  Person,
  Poll,
  Post,
  Profile,
  Quest,
  Redemption,
  Relationship,
  Reward,
  Room,
  Submission,
  Task,
  Standing,
  Wallet,
} from "./community.types";
const id = encodeURIComponent;
const before = (cursor?: string | null) =>
  cursor ? `?before=${id(cursor)}` : "";
export const community = {
  league: () => getJson<{ league: League }>("/leagues/current"),
  leaderboard: (scope: "league" | "friends") =>
    getJson<{ entries: Standing[] }>(`/leaderboard?scope=${scope}`),
  quests: () => getJson<{ quests: Quest[] }>("/quests"),
  claim: (questId: string) => postJson(`/quests/${id(questId)}/claim`, {}),
  achievements: () => getJson<{ achievements: Achievement[] }>("/achievements"),
  achievement: (achievementId: string) =>
    getJson<{ achievement: Achievement }>(`/achievements/${id(achievementId)}`),
  rewards: () => getJson<{ balance: number; rewards: Reward[] }>("/rewards"),
  redeem: (rewardId: string) => postJson(`/rewards/${id(rewardId)}/redeem`, {}),
  redemptions: () => getJson<{ redemptions: Redemption[] }>("/redemptions"),
  cancelRedemption: (redemptionId: string) =>
    deleteJson(`/redemptions/${id(redemptionId)}`),
  wallet: () => getJson<Wallet>("/wallet"),
  friends: () => getJson<{ friends: Friend[] }>("/friends"),
  requests: () => getJson<{ requests: FriendRequest[] }>("/friend-requests"),
  searchUsers: (q: string) =>
    getJson<{ users: (Person & { relationship: Relationship })[] }>(
      `/users/search?q=${id(q)}`,
    ),
  profile: (userId: string) =>
    getJson<{ user: Profile }>(`/users/${id(userId)}`),
  request: (userId: string) => postJson("/friend-requests", { userId }),
  respond: (requestId: string, action: "accept" | "decline") =>
    patchJson(`/friend-requests/${id(requestId)}`, { action }),
  cancelRequest: (requestId: string) =>
    deleteJson(`/friend-requests/${id(requestId)}`),
  removeFriend: (userId: string) => deleteJson(`/friends/${id(userId)}`),
  groups: (query: string, mine: boolean) =>
    getJson<{ groups: Group[] }>(
      `/study-groups?${query.trim() ? `query=${id(query.trim())}&` : ""}mine=${mine}`,
    ),
  group: (groupId: string) =>
    getJson<{ group: Group }>(`/study-groups/${id(groupId)}`),
  createGroup: (body: Record<string, unknown>) =>
    postJson<{ group: Group }>("/study-groups", body),
  updateGroup: (groupId: string, body: Record<string, unknown>) =>
    patchJson(`/study-groups/${id(groupId)}`, body),
  deleteGroup: (groupId: string) => deleteJson(`/study-groups/${id(groupId)}`),
  joinGroup: (groupId: string) =>
    postJson(`/study-groups/${id(groupId)}/membership`, {}),
  leaveGroup: (groupId: string) =>
    deleteJson(`/study-groups/${id(groupId)}/membership`),
  members: (groupId: string) =>
    getJson<{ members: Member[] }>(`/study-groups/${id(groupId)}/members`),
  challenge: (groupId: string) =>
    getJson<{ challenge: Challenge }>(`/study-groups/${id(groupId)}/challenge`),
  createChallenge: (groupId: string, body: Record<string, unknown>) =>
    postJson(`/study-groups/${id(groupId)}/challenge`, body),
  updateChallenge: (groupId: string, body: Record<string, unknown>) =>
    patchJson(`/study-groups/${id(groupId)}/challenge`, body),
  deleteChallenge: (groupId: string) =>
    deleteJson(`/study-groups/${id(groupId)}/challenge`),
  joinChallenge: (groupId: string) =>
    postJson(`/study-groups/${id(groupId)}/challenge/join`, {}),
  leaveChallenge: (groupId: string) =>
    deleteJson(`/study-groups/${id(groupId)}/challenge/join`),
  createRoom: (groupId: string, body: Record<string, unknown>) =>
    postJson<{ room: Room }>(`/study-groups/${id(groupId)}/rooms`, body),
  room: (roomId: string) =>
    getJson<{ room: Room }>(`/study-rooms/${id(roomId)}`),
  updateRoom: (roomId: string, body: Record<string, unknown>) =>
    patchJson(`/study-rooms/${id(roomId)}`, body),
  deleteRoom: (roomId: string) => deleteJson(`/study-rooms/${id(roomId)}`),
  joinRoom: (roomId: string) =>
    postJson(`/study-rooms/${id(roomId)}/participants`, {}),
  leaveRoom: (roomId: string) =>
    deleteJson(`/study-rooms/${id(roomId)}/participants/me`),
  polls: (roomId: string) =>
    getJson<{ polls: Poll[] }>(`/study-rooms/${id(roomId)}/polls`),
  createPoll: (roomId: string, body: Record<string, unknown>) =>
    postJson(`/study-rooms/${id(roomId)}/polls`, body),
  updatePoll: (roomId: string, pollId: string, body: Record<string, unknown>) =>
    patchJson(`/study-rooms/${id(roomId)}/polls/${id(pollId)}`, body),
  deletePoll: (roomId: string, pollId: string) =>
    deleteJson(`/study-rooms/${id(roomId)}/polls/${id(pollId)}`),
  vote: (roomId: string, poll: Poll, choiceId: string) =>
    poll.myChoiceId
      ? patchJson(`/study-rooms/${id(roomId)}/polls/${id(poll.id)}/votes/me`, {
          choiceId,
        })
      : postJson(`/study-rooms/${id(roomId)}/polls/${id(poll.id)}/votes`, {
          choiceId,
        }),
  withdrawVote: (roomId: string, pollId: string) =>
    deleteJson(`/study-rooms/${id(roomId)}/polls/${id(pollId)}/votes/me`),
  tasks: (groupId: string) =>
    getJson<{ tasks: Task[] }>(`/study-groups/${id(groupId)}/plan/tasks`),
  createTask: (groupId: string, body: Record<string, unknown>) =>
    postJson(`/study-groups/${id(groupId)}/plan/tasks`, body),
  updateTask: (
    groupId: string,
    taskId: string,
    body: Record<string, unknown>,
  ) => patchJson(`/study-groups/${id(groupId)}/plan/tasks/${id(taskId)}`, body),
  deleteTask: (groupId: string, taskId: string) =>
    deleteJson(`/study-groups/${id(groupId)}/plan/tasks/${id(taskId)}`),
  notes: (groupId: string) =>
    getJson<{ notes: BoardNote[] }>(
      `/study-groups/${id(groupId)}/whiteboard/notes`,
    ),
  createNote: (groupId: string, body: Record<string, unknown>) =>
    postJson(`/study-groups/${id(groupId)}/whiteboard/notes`, body),
  updateNote: (
    groupId: string,
    noteId: string,
    body: Record<string, unknown>,
  ) =>
    patchJson(
      `/study-groups/${id(groupId)}/whiteboard/notes/${id(noteId)}`,
      body,
    ),
  deleteNote: (groupId: string, noteId: string) =>
    deleteJson(`/study-groups/${id(groupId)}/whiteboard/notes/${id(noteId)}`),
  notices: (cursor?: string | null) =>
    getJson<{ notifications: Notice[]; unreadCount: number } & Cursor>(
      `/notifications${before(cursor)}`,
    ),
  readNotice: (notice: Notice) =>
    patchJson(`/notifications/${id(notice.id)}`, { read: !notice.read }),
  readAll: () => patchJson("/notifications/read-all", {}),
  deleteNotice: (noticeId: string) =>
    deleteJson(`/notifications/${id(noticeId)}`),
  clearNotices: () => deleteJson("/notifications"),
  submission: (submissionId?: string) =>
    getJson<{ submission: Submission; remaining: number }>(
      `/peer-reviews${submissionId ? `?submissionId=${id(submissionId)}` : ""}`,
    ),
};
// Discussion, comments, room messages, and peer reviews share the same owner-scoped body editor.
export function postFeed(
  kind: "discussion" | "comments" | "messages" | "reviews",
  parentId: string,
  postId?: string,
) {
  const path =
    kind === "messages"
      ? `/study-rooms/${id(parentId)}/messages`
      : kind === "reviews"
        ? `/peer-reviews/${id(parentId)}/comments`
        : `/study-groups/${id(parentId)}/discussion${kind === "comments" ? `/${id(postId ?? "")}/comments` : ""}`;
  const key =
    kind === "discussion"
      ? "posts"
      : kind === "messages"
        ? "messages"
        : "comments";
  return {
    list: async (cursor?: string | null) => {
      if (kind === "reviews") {
        const result = await community.submission(parentId);
        return { items: result.submission.comments, nextBefore: null };
      }
      const result = await getJson<
        Partial<Record<"posts" | "messages" | "comments", Post[]>> & Cursor
      >(`${path}${before(cursor)}`);
      return { items: result[key] ?? [], nextBefore: result.nextBefore };
    },
    create: (body: string, replyToId?: string) =>
      postJson(path, { body, ...(replyToId ? { replyToId } : {}) }),
    update: (itemId: string, body: string) =>
      patchJson(`${path}/${id(itemId)}`, { body }),
    remove: (itemId: string) => deleteJson(`${path}/${id(itemId)}`),
  };
}
