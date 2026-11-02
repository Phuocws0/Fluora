export type Person = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
};
export type Tier = { key: string; name: string; minXp: number };
export type Progress = {
  totalXp: number;
  weeklyXp: number;
  currentStreak: number;
  tier: Tier;
};
export type League = {
  tier: Tier;
  nextTier: Tier | null;
  totalXp: number;
  xpToNextTier: number | null;
  weeklyXp: number;
  rank: number | null;
  period: { startsAt: string; endsAt: string };
};
export type Standing = {
  rank: number;
  user: Person;
  weeklyXp: number;
  isCurrentUser: boolean;
};
export type Quest = {
  id: string;
  title: string;
  target: number;
  progress: number;
  rewardGems: number;
  status: "in_progress" | "claimable" | "claimed";
};
export type Achievement = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  earned: boolean;
  earnedAt: string | null;
  metric?: string;
};
export type Reward = {
  id: string;
  name: string;
  description: string;
  costGems: number;
  affordable: boolean;
  fulfillment: string;
};
export type Redemption = {
  id: string;
  reward: { name: string };
  costGems: number;
  status: string;
  cancellable: boolean;
};
export type Wallet = {
  balance: number;
  transactions: {
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
  }[];
};
export type Relationship =
  | "self"
  | "friends"
  | "outgoing"
  | "incoming"
  | "declined"
  | "none";
export type Profile = Person & {
  bio: string | null;
  relationship: Relationship;
  progress: Progress | null;
  achievements: Achievement[] | null;
};
export type Friend = Person & { progress: Progress | null };
export type FriendRequest = {
  id: string;
  direction: "incoming" | "outgoing";
  status: string;
  user: Person;
};
export type Group = {
  id: string;
  name: string;
  goal: string;
  topic: string;
  visibility: "public" | "private";
  memberCount: number;
  myRole: "owner" | "member" | null;
  meetupAt: string | null;
  meetupNote: string | null;
  rooms?: Pick<Room, "id" | "name" | "focus" | "closedAt">[];
  challenge?: { id: string; title: string } | null;
};
export type Member = Person & { role: string };
export type Permissions = { canEdit: boolean; canDelete: boolean };
export type Post = Permissions & {
  id: string;
  body: string;
  author: Person;
  createdAt: string;
  editedAt: string | null;
  commentCount?: number;
  replyTo?: { id: string; author: Person; excerpt: string } | null;
};
export type Cursor = { nextBefore: string | null };
export type Challenge = {
  id: string;
  title: string;
  metric: "xp" | "lessons";
  target: number;
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "active" | "ended";
  joined: boolean;
  groupProgress: number;
  myProgress: number | null;
  participants: (Person & { progress: number })[];
};
export type Room = {
  id: string;
  groupId: string;
  name: string;
  focus: string | null;
  startsAt: string | null;
  closedAt: string | null;
  isHost: boolean;
  joined: boolean;
  host: Person;
  participants: Person[];
};
export type Poll = {
  id: string;
  question: string;
  closed: boolean;
  totalVotes: number;
  myChoiceId: string | null;
  choices: { id: string; label: string; voteCount: number }[];
};
export type Lane = "todo" | "doing" | "done";
export type Task = Permissions & {
  id: string;
  title: string;
  lane: Lane;
  order: number;
  createdBy: Person;
};
export type NoteColor = "yellow" | "green" | "blue" | "pink";
export type BoardNote = Permissions & {
  id: string;
  text: string;
  x: number;
  y: number;
  color: NoteColor;
  author: Person;
};
export type Notice = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};
export type Submission = {
  id: string;
  title: string;
  prompt: string;
  body: string;
  authorLabel: string;
  comments: Post[];
};
