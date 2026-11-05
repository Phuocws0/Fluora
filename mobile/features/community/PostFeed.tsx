import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { postFeed } from "./community.service";
import type { Post } from "./community.types";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Editor,
  Empty,
  Page,
  ResourceState,
  confirmAction,
  ui,
  useAction,
  useResource,
  type EditorSpec,
} from "../shared/feature-ui";
import { formatUiDate, LocalizedTextInput as TextInput, useAppLanguage } from "../i18n/i18n";
export function PostFeed({
  kind,
  parentId,
  postId,
  writable = true,
  editable = true,
}: {
  kind: "discussion" | "comments" | "messages";
  parentId: string;
  postId?: string;
  writable?: boolean;
  editable?: boolean;
}) {
  const { language } = useAppLanguage();
  const service = useMemo(
    () => postFeed(kind, parentId, postId),
    [kind, parentId, postId],
  );
  const r = useResource(useCallback(() => service.list(), [service]));
  const a = useAction();
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Post | null>(null);
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const [older, setOlder] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  useEffect(() => {
    setOlder([]);
    setCursor(r.data?.nextBefore ?? null);
  }, [r.data]);
  const items = [...(r.data?.items ?? []), ...older];
  return (
    <>
      <View style={ui.row}>
        <Button
          label="Refresh feed"
          disabled={a.busy || r.loading}
          onPress={() => void r.refresh()}
        />
      </View>
      <ResourceState resource={r} />
      <ActionState action={a} />
      {writable ? (
        <>
          <TextInput
            accessibilityLabel="Write a message"
            placeholder={
              kind === "discussion" ? "Start a discussion…" : "Write a message…"
            }
            multiline
            maxLength={kind === "discussion" ? 2000 : 1000}
            style={ui.input}
            value={body}
            onChangeText={setBody}
            editable={!a.busy}
          />
          {reply && (
            <View style={ui.row}>
              <Copy>Reply to: {reply.body.slice(0, 80)}</Copy>
              <Button label="Cancel reply" onPress={() => setReply(null)} />
            </View>
          )}
          <Button
            label="Send"
            disabled={a.busy || !body.trim()}
            onPress={() =>
              void a.run(async () => {
                await service.create(body.trim(), reply?.id);
                setBody("");
                setReply(null);
                await r.refresh();
              }, "Message sent.")
            }
          />
        </>
      ) : (
        <Copy>Join the open room before sending messages.</Copy>
      )}
      {r.data && !r.loading && (
        <>
          {!items.length && (
            <Empty text="Be the first to start a conversation." />
          )}
          {items.map((p) => (
            <Card key={p.id}>
              <Copy>
                {p.author.displayName ?? "Learner"} ·{" "}
                {formatUiDate(p.createdAt, language, { dateStyle: "medium", timeStyle: "short" })}
                {p.editedAt ? " · edited" : ""}
              </Copy>
              {p.replyTo && (
                <Copy translate={false}>
                  ↳ {p.replyTo.author.displayName}: {p.replyTo.excerpt}
                </Copy>
              )}
              <Copy translate={false}>{p.body}</Copy>
              <View style={ui.row}>
                {kind === "discussion" && (
                  <Button
                    label={`Comments (${p.commentCount ?? 0})`}
                    onPress={() =>
                      router.push({
                        pathname:
                          "/community/groups/[groupId]/comments/[postId]",
                        params: { groupId: parentId, postId: p.id },
                      })
                    }
                  />
                )}
                {kind === "messages" && writable && (
                  <Button label="Reply" onPress={() => setReply(p)} />
                )}
                {p.canEdit && editable && (
                  <Button
                    label="Edit"
                    disabled={a.busy}
                    onPress={() =>
                      setEditor({
                        title: "Edit message",
                        fields: [
                          {
                            key: "body",
                            label: "Message",
                            value: p.body,
                            required: true,
                            max: kind === "discussion" ? 2000 : 1000,
                            multiline: true,
                          },
                        ],
                        save: async (v) => {
                          await service.update(p.id, v.body);
                          await r.refresh();
                        },
                      })
                    }
                  />
                )}
                {p.canDelete && (
                  <Button
                    label="Delete"
                    danger
                    disabled={a.busy}
                    onPress={() =>
                      confirmAction(
                        "Delete message?",
                        kind === "discussion"
                          ? "This also removes the post's comments."
                          : "This message will be removed.",
                        () =>
                          void a.run(async () => {
                            await service.remove(p.id);
                            await r.refresh();
                          }, "Message deleted."),
                      )
                    }
                  />
                )}
              </View>
            </Card>
          ))}
          {cursor && (
            <Button
              label="Load older"
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  const page = await service.list(cursor);
                  setOlder((previous) => [
                    ...previous,
                    ...page.items.filter(
                      (p) => !items.some((old) => old.id === p.id),
                    ),
                  ]);
                  setCursor(page.nextBefore);
                }, "")
              }
            />
          )}
        </>
      )}
      <Editor spec={editor} close={() => setEditor(null)} />
    </>
  );
}
export default function DiscussionScreen({
  groupId,
  postId,
}: {
  groupId: string;
  postId?: string;
}) {
  return (
    <Page title={postId ? "Comments" : "Group discussion"} back>
      <PostFeed
        key={`${groupId}/${postId ?? ""}`}
        parentId={groupId}
        postId={postId}
        kind={postId ? "comments" : "discussion"}
      />
    </Page>
  );
}
