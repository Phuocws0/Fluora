import { REFERENCE_VOCABULARY } from "../features/practice/reference-vocabulary.js";
import { createHash } from "node:crypto";
import type { Prisma } from "../generated/prisma/client.js";
import { hashPassword } from "../features/identity/credentials.js";
import { findTurn, parseTurns } from "../features/tutor/role-play.js";
import { pairKey as friendPairKey } from "../features/community/visibility.js";
import { listAchievements } from "../features/league/achievements.service.js";
import { prisma } from "./prisma.js";

/** Public, deliberately non-secret local-demo credential; override it with DEMO_PASSWORD. Never reuse for real accounts. */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "FluoraDemo123!";
export const DEMO_USERS = [
  { key: "linh", email: "demo.linh@fluora.local", name: "Linh (demo)", level: "A1", completions: 0 },
  { key: "minh", email: "demo.minh@fluora.local", name: "Minh (demo)", level: "A1", completions: 2 },
  { key: "an", email: "demo.an@fluora.local", name: "An (demo)", level: "B1", completions: Infinity },
  { key: "new", email: "demo.new@fluora.local", name: "New learner (demo)", level: "A1", completions: 0 },
] as const;

/** Stable UUIDs keep fixture rows separate from ordinary learner-created rows and make reruns non-duplicating. */
export function demoId(key: string): string {
  const bytes = createHash("sha256").update(`fluora-demo-v1:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const words = REFERENCE_VOCABULARY.map(item => [item.word, item.translation, item.example] as const);

const now = () => new Date();
function dateAt(offset: number, minutesBefore = 0): Date {
  const date = now(); date.setUTCDate(date.getUTCDate() + offset); date.setUTCMinutes(date.getUTCMinutes() - minutesBefore); return date;
}

type Exercise = Prisma.ExerciseGetPayload<{ include: { options: true } }>;
function answerFor(exercise: Exercise): Prisma.InputJsonObject {
  const key = exercise.answerKey as Prisma.JsonObject;
  if (exercise.type === "multiple_choice" || exercise.type === "listening_choice") {
    const option = exercise.options.find(option => option.value === key.optionValue);
    if (!option) throw new Error(`Demo answer is missing for ${exercise.id}`);
    return { kind: "choice", optionId: option.id };
  }
  if (exercise.type === "sentence_tiles") return { kind: "sentence_tiles", tokens: key.tokens as Prisma.InputJsonArray };
  if (exercise.type === "matching") return { kind: "matching", pairs: key.pairs as Prisma.InputJsonArray };
  if (exercise.type === "speaking") return { kind: "speaking", transcript: (exercise.content as Prisma.JsonObject).suggestedPhrase as string, score: 80 };
  const accepted = key.accepted as string[];
  if (!accepted?.length) throw new Error(`Demo answer is missing for ${exercise.id}`);
  return { kind: exercise.type, text: accepted[0] };
}

async function seedAccounts() {
  if (DEMO_PASSWORD.length < 8 || DEMO_PASSWORD.length > 128) throw new Error("DEMO_PASSWORD must contain 8–128 characters.");
  const users = [];
  for (const definition of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: definition.email } });
    const passwordHash = existing?.passwordHash ?? await hashPassword(DEMO_PASSWORD);
    const user = await prisma.user.upsert({ where: { email: definition.email },
      create: { email: definition.email, displayName: definition.name, passwordHash, emailVerifiedAt: now(), bio: "A local Fluora demo account. Sample data can be edited through the app." },
      update: existing?.passwordHash ? {} : { passwordHash, emailVerifiedAt: now() },
    });
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    await prisma.userSettings.upsert({ where: { userId: user.id }, create: {
      userId: user.id, courseLanguage: "en", startingLevel: definition.level, dailyGoalMinutes: 10, dailyTimeBudgetMinutes: 15,
      learningPromise: "A little practice every day.", floCompanion: "flo-sprout", timezone: "Asia/Ho_Chi_Minh", discoverable: true,
      progressVisibility: "public", onboardingCompletedAt: definition.key === "new" ? null : now(),
    }, update: {
      ...(!settings?.courseLanguage ? { courseLanguage: "en" } : {}),
      ...(!settings?.startingLevel ? { startingLevel: definition.level } : {}),
      ...(definition.key !== "new" && !settings?.onboardingCompletedAt ? { onboardingCompletedAt: now() } : {}),
      ...(definition.key !== "new" && !settings?.onboardingCompletedAt ? { dailyGoalMinutes: 10, dailyTimeBudgetMinutes: 15, floCompanion: "flo-sprout", timezone: "Asia/Ho_Chi_Minh" } : {}),
    } });
    users.push({ ...definition, id: user.id });
  }
  return users;
}

type DemoUser = Awaited<ReturnType<typeof seedAccounts>>[number];

async function seedLearningState(user: DemoUser) {
  const lessons = await prisma.lesson.findMany({ where: { unit: { course: { slug: { in: ["english-foundations", "everyday-conversations", "confident-communication"] } } } }, orderBy: [{ unit: { course: { order: "asc" } } }, { unit: { order: "asc" } }, { order: "asc" }], include: { exercises: { include: { options: true }, orderBy: { order: "asc" } } } });
  const completed = lessons.slice(0, user.completions);
  for (const [index, lesson] of completed.entries()) {
    const offset = user.key === "an" ? Math.floor(index / 4) - 2 : index - completed.length + 1;
    const completedAt = dateAt(offset, 2);
    for (const exercise of lesson.exercises) {
      const id = demoId(`${user.key}:answer:${exercise.id}`);
      const data = { id, userId: user.id, exerciseId: exercise.id, answer: answerFor(exercise), isCorrect: true, score: exercise.type === "speaking" ? 80 : 100, feedback: "Seeded completed practice example.", createdAt: dateAt(offset, 3) };
      await prisma.userAnswer.upsert({ where: { id }, create: data, update: {} });
    }
    await prisma.lessonCompletion.upsert({ where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      create: { id: demoId(`${user.key}:completion:${lesson.id}`), userId: user.id, lessonId: lesson.id, xpEarned: 10 + lesson.exercises.length * 2, completedAt },
      update: { completedAt },
    });
  }
  const exercise = lessons[0].exercises[0];
  const wrong = exercise.options.find(option => !(exercise.answerKey as Prisma.JsonObject).optionValue || option.value !== (exercise.answerKey as Prisma.JsonObject).optionValue);
  if (wrong) for (let attempt = 0; attempt < 2; attempt++) {
    const id = demoId(`${user.key}:mistake:${attempt}`);
    await prisma.userAnswer.upsert({ where: { id }, create: { id, userId: user.id, exerciseId: exercise.id, answer: { kind: "choice", optionId: wrong.id }, isCorrect: false, score: 0, feedback: "Review the time-of-day greeting before trying again.", createdAt: dateAt(-1, attempt + 5) }, update: {} });
  }
  const reviewId = demoId(`${user.key}:mistake-review`);
  await prisma.reviewItem.upsert({ where: { userId_sourceExerciseId: { userId: user.id, sourceExerciseId: exercise.id } }, create: { id: reviewId, userId: user.id, sourceExerciseId: exercise.id, kind: "mistake", front: exercise.prompt, back: "Use Good morning as a greeting in the morning.", nextReviewAt: dateAt(-1) }, update: {} });
  for (const [goalSlug, lessonSlug] of [["introduce-yourself", "greetings-and-introductions"], ["ask-for-directions", "understanding-directions"], ["everyday-conversations-evidence", "making-plans"], ["confident-communication-evidence", "sharing-opinions"]]) {
    const lesson = completed.find(item => item.slug === lessonSlug);
    const goal = await prisma.canDoGoal.findUnique({ where: { slug: goalSlug } });
    if (!goal || !lesson) continue;
    const id = demoId(`${user.key}:evidence:${goal.id}`);
    await prisma.learningEvidence.upsert({ where: { id }, create: { id, userId: user.id, goalId: goal.id, kind: "lesson", summary: `Completed ${lesson.title} and practised the example phrases.`, reference: lesson.title }, update: {} });
  }
  if (user.key === "an") for (const mission of await prisma.mission.findMany()) {
    if (mission.requiredLessonId && !completed.some(lesson => lesson.id === mission.requiredLessonId)) continue;
    await prisma.missionCompletion.upsert({ where: { userId_missionId: { userId: user.id, missionId: mission.id } }, create: { userId: user.id, missionId: mission.id }, update: {} });
  }
}

async function seedPracticeAndProfile(user: DemoUser) {
  for (const [setIndex, title] of ["Everyday English", "Travel and conversations"].entries()) {
    const setId = demoId(`${user.key}:deck:${setIndex}`);
    await prisma.vocabularySet.upsert({ where: { id: setId }, create: { id: setId, userId: user.id, name: title }, update: {} });
    for (const [index, [front, back, example]] of words.slice(setIndex * 15, setIndex * 15 + 15).entries()) {
      const id = demoId(`${user.key}:card:${setIndex}:${index}`);
      await prisma.vocabularyCard.upsert({ where: { id }, create: { id, setId, front, back, example, tag: setIndex ? "travel" : "daily" }, update: {} });
    }
  }
  for (let i = 0; i < 5; i++) {
    const [front, back] = words[i + 5];
    const id = demoId(`${user.key}:review:${i}`);
    await prisma.reviewItem.upsert({ where: { id }, create: { id, userId: user.id, front, back, nextReviewAt: dateAt(i < 2 ? -1 : 2) }, update: {} });
    if (i >= 2) for (const offset of user.key === "an" ? [-2, -1, 0] : [0]) {
      const outcomeId = demoId(`${user.key}:review-outcome:${i}:${offset}`);
      await prisma.reviewOutcome.upsert({ where: { id: outcomeId }, create: { id: outcomeId, itemId: id, correct: true, createdAt: dateAt(offset, 4) }, update: { createdAt: dateAt(offset, 4) } });
    }
  }
  const stories = await prisma.story.findMany({ orderBy: { slug: "asc" } });
  for (const [index, story] of stories.slice(0, 3).entries()) {
    const paragraphs = (story.content as Prisma.JsonObject).paragraphs;
    const lastPosition = Array.isArray(paragraphs) ? Math.max(0, paragraphs.length - 1) : 0;
    const data = { userId: user.id, storyId: story.id, position: user.key === "linh" ? Math.min(1, lastPosition) : lastPosition, completed: user.key !== "linh", updatedAt: dateAt(user.key === "an" ? index - 2 : 0, 4) };
    await prisma.readingProgress.upsert({ where: { userId_storyId: { userId: user.id, storyId: story.id } }, create: data, update: { updatedAt: data.updatedAt } });
    await prisma.bookmark.upsert({ where: { userId_targetType_targetId: { userId: user.id, targetType: "story", targetId: story.id } }, create: { userId: user.id, targetType: "story", targetId: story.id, note: "Read this again and collect useful expressions.", tag: "practice" }, update: {} });
  }
  await prisma.bookmark.upsert({ where: { userId_targetType_targetId: { userId: user.id, targetType: "word", targetId: "hello" } }, create: { userId: user.id, targetType: "word", targetId: "hello", note: "Use this to start a conversation.", tag: "greeting" }, update: {} });
  for (const [index, offset] of [-1, 0, 1, 3].entries()) {
    const id = demoId(`${user.key}:planner:${index}`);
    const date = dateAt(offset).toISOString().slice(0, 10);
    await prisma.plannerEntry.upsert({ where: { id }, create: { id, userId: user.id, date, time: index % 2 ? "19:30" : "08:00", durationMinutes: 15, label: ["Review greetings", "Listen and practise", "Read a short story", "Study with the group"][index] }, update: { date } });
  }
  if (user.key !== "linh") {
    for (const status of ["open", "closed"]) {
      const id = demoId(`${user.key}:support:${status}`);
      await prisma.supportRequest.upsert({ where: { id }, create: { id, userId: user.id, status, message: status === "open" ? "Demo request: please help me find the download controls." : "Demo resolved request: I found my saved vocabulary deck.", deviceDetails: { platform: "android", issueCategory: "Learning content" } }, update: {} });
    }
    const id = demoId(`${user.key}:export`);
    await prisma.dataExportRequest.upsert({ where: { id }, create: { id, userId: user.id, status: "ready" }, update: {} });
  }
}

async function seedCommunity(users: DemoUser[]) {
  const [linh, minh, an] = users;
  for (const [requester, addressee, status] of [[an, linh, "accepted"], [minh, linh, "pending"], [an, minh, "pending"]] as const) {
    const pairKey = friendPairKey(requester.id, addressee.id);
    const request = await prisma.friendRequest.upsert({ where: { pairKey }, create: { requesterId: requester.id, addresseeId: addressee.id, pairKey, status, respondedAt: status === "accepted" ? dateAt(-1) : null }, update: {} });
    if (request.status === "pending") {
      const dedupeKey = `demo:friend:${pairKey}`;
      await prisma.notification.upsert({ where: { userId_dedupeKey: { userId: addressee.id, dedupeKey } }, create: { userId: addressee.id, dedupeKey, type: "friend_request_received", title: "A demo study buddy request", body: `${requester.name} wants to learn with you.`, data: { requestId: request.id, fromUserId: requester.id } }, update: {} });
    }
  }
  for (const [index, definition] of [
    { name: "Fluora demo garden", goal: "Build a daily learning habit together.", owner: minh, visibility: "public", topic: "english" },
    { name: "Conversation circle", goal: "Practise friendly everyday conversations.", owner: linh, visibility: "public", topic: "speaking" },
    { name: "Writing lab", goal: "Review short English paragraphs.", owner: an, visibility: "private", topic: "writing" },
  ].entries()) {
    const id = demoId(`group:${index}`);
    const group = await prisma.studyGroup.upsert({ where: { id }, create: { id, name: definition.name, goal: definition.goal, topic: definition.topic, visibility: definition.visibility, meetupAt: dateAt(1), meetupNote: "Local demo meetup — no external meeting service is required." }, update: {} });
    const members = index === 2 ? [minh, an] : users.slice(0, 3);
    const currentOwner = await prisma.groupMembership.findFirst({ where: { groupId: id, role: "owner" } });
    for (const user of members) {
      const role = user.id === (currentOwner?.userId ?? definition.owner.id) ? "owner" : "member";
      await prisma.groupMembership.upsert({ where: { groupId_userId: { groupId: id, userId: user.id } }, create: { groupId: id, userId: user.id, role }, update: {} });
    }
    for (let postIndex = 0; postIndex < (index === 0 ? 24 : 2); postIndex++) {
      const postId = demoId(`group:${index}:post:${postIndex}`);
      const author = members[postIndex % members.length];
      await prisma.groupPost.upsert({ where: { id: postId }, create: { id: postId, groupId: id, authorId: author.id, body: postIndex === 0 ? "Welcome! Share one useful English expression you learned today." : `Practice discussion ${postIndex}: ${words[postIndex % words.length][2]}`, createdAt: dateAt(0, postIndex + 20) }, update: {} });
      if (postIndex === 0) for (const user of members) {
        const commentId = demoId(`group:${index}:comment:${user.key}`);
        await prisma.groupComment.upsert({ where: { id: commentId }, create: { id: commentId, postId, authorId: user.id, body: "I am practising polite questions. Could you help me, please?" }, update: {} });
      }
    }
    const challenge = await prisma.groupChallenge.upsert({ where: { groupId: id }, create: { id: demoId(`group:${index}:challenge`), groupId: id, title: "Complete four lessons together", metric: "lessons", target: 4, startsAt: dateAt(-3), endsAt: dateAt(4) }, update: { startsAt: dateAt(-3), endsAt: dateAt(4) } });
    for (const user of members) await prisma.challengeParticipant.upsert({ where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } }, create: { challengeId: challenge.id, userId: user.id }, update: {} });
    for (const [taskIndex, lane] of ["todo", "doing", "done"].entries()) {
      const taskId = demoId(`group:${index}:task:${taskIndex}`);
      await prisma.groupPlanTask.upsert({ where: { id: taskId }, create: { id: taskId, groupId: id, createdById: members[taskIndex % members.length].id, title: ["Choose a topic", "Practise a dialogue", "Share useful phrases"][taskIndex], lane, order: 1 }, update: {} });
      const noteId = demoId(`group:${index}:note:${taskIndex}`);
      await prisma.whiteboardNote.upsert({ where: { id: noteId }, create: { id: noteId, groupId: id, authorId: members[taskIndex % members.length].id, text: words[taskIndex + 5][2], x: taskIndex * 130, y: taskIndex * 30, color: ["yellow", "green", "blue"][taskIndex] }, update: {} });
    }
    const roomId = demoId(`group:${index}:room`);
    await prisma.studyRoom.upsert({ where: { id: roomId }, create: { id: roomId, groupId: group.id, hostId: definition.owner.id, name: "Daily practice room", focus: "Short English conversations", startsAt: dateAt(0) }, update: {} });
    for (const user of members) await prisma.roomParticipant.upsert({ where: { roomId_userId: { roomId, userId: user.id } }, create: { roomId, userId: user.id }, update: {} });
    for (let i = 0; i < (index === 0 ? 24 : 3); i++) {
      const messageId = demoId(`room:${index}:message:${i}`);
      await prisma.roomMessage.upsert({ where: { id: messageId }, create: { id: messageId, roomId, authorId: members[i % members.length].id, body: i ? `Let's practise: ${words[i % words.length][2]}` : "Welcome to today's practice room!", replyToId: i ? demoId(`room:${index}:message:0`) : null, createdAt: dateAt(0, 60 - i) }, update: {} });
    }
    for (const closed of [false, true]) {
      const pollId = demoId(`room:${index}:poll:${closed}`);
      await prisma.poll.upsert({ where: { id: pollId }, create: { id: pollId, roomId, question: closed ? "Which topic did you enjoy yesterday?" : "What should we practise next?", closedAt: closed ? dateAt(-1) : null }, update: {} });
      for (const [choiceIndex, label] of ["Everyday conversations", "Travel English"].entries()) {
        await prisma.pollChoice.upsert({ where: { pollId_order: { pollId, order: choiceIndex + 1 } }, create: { id: demoId(`poll:${index}:${closed}:choice:${choiceIndex}`), pollId, order: choiceIndex + 1, label }, update: {} });
      }
      for (const [voteIndex, user] of [an, minh].entries()) {
        const choice = await prisma.pollChoice.findUniqueOrThrow({ where: { pollId_order: { pollId, order: voteIndex + 1 } } });
        await prisma.pollVote.upsert({ where: { pollId_userId: { pollId, userId: user.id } }, create: { pollId, userId: user.id, choiceId: choice.id }, update: {} });
      }
    }
    const closedRoomId = demoId(`group:${index}:closed-room`);
    await prisma.studyRoom.upsert({ where: { id: closedRoomId }, create: { id: closedRoomId, groupId: id, hostId: definition.owner.id, name: "Previous practice session", closedAt: dateAt(-1) }, update: {} });
  }
  for (const user of users.slice(0, 3)) {
    for (let i = 0; i < 24; i++) {
      const dedupeKey = `demo:${user.key}:notification:${i}`;
      await prisma.notification.upsert({ where: { userId_dedupeKey: { userId: user.id, dedupeKey } }, create: { userId: user.id, dedupeKey, type: "study_reminder", title: i % 2 ? "A little practice today" : "Your learning garden", body: "Open Practice to review a few useful words.", data: { demo: true }, readAt: i % 3 ? null : dateAt(0, i), createdAt: dateAt(0, i + 5) }, update: {} });
    }
    const submission = await prisma.peerReviewSubmission.findFirst({ orderBy: { order: "asc" } });
    if (submission && user.key === "an") {
      const id = demoId(`${user.key}:peer-review`);
      await prisma.peerReviewComment.upsert({ where: { id }, create: { id, submissionId: submission.id, authorId: user.id, body: "Good ideas! After will, use the base verb: we will cook." }, update: {} });
    }
  }
}

async function seedWallet(an: DemoUser) {
  const quests = await prisma.quest.findMany({ where: { isActive: true, slug: { in: ["daily-lesson", "daily-xp", "daily-review", "daily-story"] } } });
  for (const offset of [-2, -1, 0]) for (const quest of quests) {
    const periodKey = dateAt(offset).toISOString().slice(0, 10);
    const claim = await prisma.questClaim.upsert({ where: { userId_questId_periodKey: { userId: an.id, questId: quest.id, periodKey } }, create: { userId: an.id, questId: quest.id, periodKey, rewardGems: quest.rewardGems, claimedAt: dateAt(offset) }, update: {} });
    await prisma.walletTransaction.upsert({ where: { questClaimId: claim.id }, create: { userId: an.id, questClaimId: claim.id, amount: claim.rewardGems, reason: "quest_reward", createdAt: claim.claimedAt }, update: {} });
  }
  for (const [fixture, slug, status] of [["profile-frame", "profile-frame", "fulfilled"], ["streak-freeze", "streak-freeze", "pending"], ["cancelled-freeze", "streak-freeze", "cancelled"]] as const) {
    const reward = await prisma.reward.findUniqueOrThrow({ where: { slug } });
    const id = demoId(`an:redemption:${fixture}`);
    const redemption = await prisma.rewardRedemption.upsert({ where: { id }, create: { id, userId: an.id, rewardId: reward.id, costGems: reward.costGems, status, cancelledAt: status === "cancelled" ? dateAt(-1) : null }, update: {} });
    await prisma.walletTransaction.upsert({ where: { redemptionId_reason: { redemptionId: id, reason: "redemption" } }, create: { userId: an.id, redemptionId: id, amount: -redemption.costGems, reason: "redemption" }, update: {} });
    if (redemption.status === "cancelled") await prisma.walletTransaction.upsert({ where: { redemptionId_reason: { redemptionId: id, reason: "refund" } }, create: { userId: an.id, redemptionId: id, amount: redemption.costGems, reason: "refund" }, update: {} });
  }
}

async function seedTutorHistory(user: DemoUser) {
  const chatId = demoId(`${user.key}:chat`);
  await prisma.tutorConversation.upsert({ where: { id: chatId }, create: { id: chatId, userId: user.id, kind: "chat", title: "Seeded example · asking for help", saved: true }, update: {} });
  const learnerId = demoId(`${user.key}:chat:question`), tutorId = demoId(`${user.key}:chat:reply`);
  await prisma.tutorMessage.upsert({ where: { id: learnerId }, create: { id: learnerId, conversationId: chatId, role: "learner", body: "How do I ask for help politely?" }, update: {} });
  await prisma.tutorMessage.upsert({ where: { id: tutorId }, create: { id: tutorId, conversationId: chatId, replyToId: learnerId, role: "tutor", body: "Seeded example: You can say, “Could you help me, please?” Use could you plus the base verb for a polite request." }, update: {} });
  const noteId = demoId(`${user.key}:tutor-note`);
  await prisma.tutorNote.upsert({ where: { id: noteId }, create: { id: noteId, userId: user.id, conversationId: chatId, messageId: tutorId, phrase: "Could you help me, please?", pattern: "Could you + base verb ...?", personalExample: "Could you explain this sentence, please?" }, update: {} });
  const scenario = await prisma.tutorScenario.findFirstOrThrow({ orderBy: { order: "asc" } });
  const turns = parseTurns(scenario.turns);
  for (const completed of [false, true]) {
    const id = demoId(`${user.key}:role-play:${completed}`);
    await prisma.tutorConversation.upsert({ where: { id }, create: { id, userId: user.id, kind: "role_play", scenarioId: scenario.id, title: `${completed ? "Completed" : "Continue"} · ${scenario.title}`, saved: true, status: completed ? "completed" : "active", currentTurnKey: completed ? null : scenario.startTurnKey }, update: {} });
    await prisma.tutorMessage.upsert({ where: { id: demoId(`${id}:opening`) }, create: { id: demoId(`${id}:opening`), conversationId: id, role: "tutor", body: findTurn(turns, scenario.startTurnKey).tutorLine, createdAt: dateAt(0, 3) }, update: {} });
    if (completed) {
      let key: string | null = scenario.startTurnKey, step = 0;
      while (key) {
        const turn = findTurn(turns, key), choice = turn.choices[0];
        const learnerId = demoId(`${id}:learner:${step}`), replyId = demoId(`${id}:reply:${step}`);
        await prisma.tutorMessage.upsert({ where: { id: learnerId }, create: { id: learnerId, conversationId: id, role: "learner", body: choice.label, turnKey: key, createdAt: new Date(Date.now() - 120000 + step * 2000) }, update: {} });
        await prisma.tutorMessage.upsert({ where: { id: replyId }, create: { id: replyId, conversationId: id, replyToId: learnerId, role: "tutor", turnKey: key, body: choice.next ? findTurn(turns, choice.next).tutorLine : scenario.closingLine, feedback: { verdict: "correct", correction: null, explanation: choice.explanation }, createdAt: new Date(Date.now() - 119000 + step * 2000) }, update: {} });
        key = choice.next; step++;
        if (step > turns.length) throw new Error("Demo role-play path must terminate.");
      }
    }
  }
}

export async function seedFullDemo() {
  const users = await seedAccounts();
  for (const user of users.filter(user => user.key !== "new")) { await seedLearningState(user); await seedPracticeAndProfile(user); await seedTutorHistory(user); }
  await seedCommunity(users);
  await seedWallet(users[2]);
  for (const user of users.slice(0, 3)) await listAchievements(user.id);
  console.log("Full local demo fixtures ready: four sign-in accounts, learning/review/planner, groups/rooms/polls, wallet, profile/support and Tutor history. Existing non-demo users are untouched.");
}
