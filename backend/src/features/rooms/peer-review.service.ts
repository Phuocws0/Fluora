import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { userSummarySelect } from "../community/user-summary.js";

const commentSelect = {
  id: true,
  authorId: true,
  body: true,
  editedAt: true,
  createdAt: true,
  author: { select: userSummarySelect },
} satisfies Prisma.PeerReviewCommentSelect;

type CommentRow = Prisma.PeerReviewCommentGetPayload<{ select: typeof commentSelect }>;

function toComment({ authorId, ...comment }: CommentRow, userId: string) {
  const own = authorId === userId;
  return { ...comment, canEdit: own, canDelete: own };
}

function notFound(): HttpError {
  return new HttpError(404, "NOT_FOUND", "Peer-review submission not found.");
}

/** Curated sample writing. Without an ID, returns the first submission the learner hasn't reviewed yet. */
export async function getSubmission(userId: string, submissionId?: string) {
  const unreviewed = { comments: { none: { authorId: userId } } } satisfies Prisma.PeerReviewSubmissionWhereInput;
  const target = submissionId
    ? await prisma.peerReviewSubmission.findUnique({ where: { id: submissionId }, select: { id: true } })
    : (await prisma.peerReviewSubmission.findFirst({ where: unreviewed, orderBy: { order: "asc" }, select: { id: true } })) ??
      (await prisma.peerReviewSubmission.findFirst({ orderBy: { order: "asc" }, select: { id: true } }));
  if (!target) throw notFound();

  const [submission, remaining] = await Promise.all([
    prisma.peerReviewSubmission.findUniqueOrThrow({
      where: { id: target.id },
      select: {
        id: true,
        title: true,
        prompt: true,
        body: true,
        authorLabel: true,
        comments: { orderBy: { createdAt: "asc" }, select: commentSelect },
      },
    }),
    prisma.peerReviewSubmission.count({ where: unreviewed }),
  ]);
  return { submission: { ...submission, comments: submission.comments.map((comment) => toComment(comment, userId)) }, remaining };
}

export async function createComment(userId: string, submissionId: string, body: string) {
  const submission = await prisma.peerReviewSubmission.findUnique({ where: { id: submissionId }, select: { id: true } });
  if (!submission) throw notFound();
  const comment = await prisma.peerReviewComment.create({ data: { submissionId, authorId: userId, body }, select: commentSelect });
  return { comment: toComment(comment, userId) };
}

async function ownComment(userId: string, submissionId: string, commentId: string) {
  const comment = await prisma.peerReviewComment.findFirst({ where: { id: commentId, submissionId }, select: { authorId: true } });
  if (!comment) throw new HttpError(404, "NOT_FOUND", "Comment not found.");
  if (comment.authorId !== userId) throw new HttpError(403, "AUTHOR_ONLY", "Only the author can change this comment.");
}

export async function updateComment(userId: string, submissionId: string, commentId: string, body: string) {
  await ownComment(userId, submissionId, commentId);
  const comment = await prisma.peerReviewComment.update({ where: { id: commentId }, data: { body, editedAt: new Date() }, select: commentSelect });
  return { comment: toComment(comment, userId) };
}

export async function deleteComment(userId: string, submissionId: string, commentId: string) {
  await ownComment(userId, submissionId, commentId);
  await prisma.peerReviewComment.delete({ where: { id: commentId } });
  return { deleted: true };
}
