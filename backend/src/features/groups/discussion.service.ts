import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../../http/errors.js";
import { createdBefore, toPage, type PageQuery } from "../../http/pagination.js";
import { userSummarySelect } from "../community/user-summary.js";
import { loadGroupForMember, type GroupAccess } from "./access.js";

const postSelect = {
  id: true,
  authorId: true,
  body: true,
  editedAt: true,
  createdAt: true,
  author: { select: userSummarySelect },
  _count: { select: { comments: true } },
} satisfies Prisma.GroupPostSelect;

const commentSelect = {
  id: true,
  authorId: true,
  body: true,
  editedAt: true,
  createdAt: true,
  author: { select: userSummarySelect },
} satisfies Prisma.GroupCommentSelect;

type PostRow = Prisma.GroupPostGetPayload<{ select: typeof postSelect }>;
type CommentRow = Prisma.GroupCommentGetPayload<{ select: typeof commentSelect }>;

function permissions(authorId: string, userId: string, access: GroupAccess) {
  const canEdit = authorId === userId;
  return { canEdit, canDelete: canEdit || access.isOwner };
}

function toPost({ authorId, _count, ...post }: PostRow, userId: string, access: GroupAccess) {
  return { ...post, commentCount: _count.comments, ...permissions(authorId, userId, access) };
}

function toComment({ authorId, ...comment }: CommentRow, userId: string, access: GroupAccess) {
  return { ...comment, ...permissions(authorId, userId, access) };
}

function authorOnly(): HttpError {
  return new HttpError(403, "AUTHOR_ONLY", "Only the author can edit this.");
}

async function findPost(groupId: string, postId: string) {
  const post = await prisma.groupPost.findFirst({ where: { id: postId, groupId }, select: { id: true, authorId: true } });
  if (!post) throw new HttpError(404, "NOT_FOUND", "Post not found.");
  return post;
}

async function findComment(groupId: string, postId: string, commentId: string) {
  const comment = await prisma.groupComment.findFirst({
    where: { id: commentId, postId, post: { groupId } },
    select: { id: true, authorId: true },
  });
  if (!comment) throw new HttpError(404, "NOT_FOUND", "Comment not found.");
  return comment;
}

export async function listPosts(userId: string, groupId: string, page: PageQuery) {
  const access = await loadGroupForMember(groupId, userId);
  const rows = await prisma.groupPost.findMany({
    where: { groupId, ...createdBefore(page) },
    orderBy: { createdAt: "desc" },
    take: page.limit + 1,
    select: postSelect,
  });
  const result = toPage(rows, page);
  return { posts: result.items.map((row) => toPost(row, userId, access)), nextBefore: result.nextBefore };
}

export async function createPost(userId: string, groupId: string, body: string) {
  const access = await loadGroupForMember(groupId, userId);
  const post = await prisma.groupPost.create({ data: { groupId, authorId: userId, body }, select: postSelect });
  return { post: toPost(post, userId, access) };
}

export async function updatePost(userId: string, groupId: string, postId: string, body: string) {
  const access = await loadGroupForMember(groupId, userId);
  const post = await findPost(groupId, postId);
  if (post.authorId !== userId) throw authorOnly();
  const updated = await prisma.groupPost.update({ where: { id: postId }, data: { body, editedAt: new Date() }, select: postSelect });
  return { post: toPost(updated, userId, access) };
}

export async function deletePost(userId: string, groupId: string, postId: string) {
  const access = await loadGroupForMember(groupId, userId);
  const post = await findPost(groupId, postId);
  if (post.authorId !== userId && !access.isOwner) throw new HttpError(403, "AUTHOR_ONLY", "Only the author or the group owner can delete this.");
  await prisma.groupPost.delete({ where: { id: postId } });
  return { deleted: true };
}

export async function listComments(userId: string, groupId: string, postId: string, page: PageQuery) {
  const access = await loadGroupForMember(groupId, userId);
  await findPost(groupId, postId);
  const rows = await prisma.groupComment.findMany({
    where: { postId, ...createdBefore(page) },
    orderBy: { createdAt: "desc" },
    take: page.limit + 1,
    select: commentSelect,
  });
  const result = toPage(rows, page);
  return { comments: result.items.map((row) => toComment(row, userId, access)), nextBefore: result.nextBefore };
}

export async function createComment(userId: string, groupId: string, postId: string, body: string) {
  const access = await loadGroupForMember(groupId, userId);
  await findPost(groupId, postId);
  const comment = await prisma.groupComment.create({ data: { postId, authorId: userId, body }, select: commentSelect });
  return { comment: toComment(comment, userId, access) };
}

export async function updateComment(userId: string, groupId: string, postId: string, commentId: string, body: string) {
  const access = await loadGroupForMember(groupId, userId);
  const comment = await findComment(groupId, postId, commentId);
  if (comment.authorId !== userId) throw authorOnly();
  const updated = await prisma.groupComment.update({ where: { id: commentId }, data: { body, editedAt: new Date() }, select: commentSelect });
  return { comment: toComment(updated, userId, access) };
}

export async function deleteComment(userId: string, groupId: string, postId: string, commentId: string) {
  const access = await loadGroupForMember(groupId, userId);
  const comment = await findComment(groupId, postId, commentId);
  if (comment.authorId !== userId && !access.isOwner) throw new HttpError(403, "AUTHOR_ONLY", "Only the author or the group owner can delete this.");
  await prisma.groupComment.delete({ where: { id: commentId } });
  return { deleted: true };
}
