import { useCallback, useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { community, postFeed } from "./community.service";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Editor,
  Empty,
  Heading,
  Page,
  ResourceState,
  confirmAction,
  ui,
  useAction,
  useResource,
  type EditorSpec,
} from "../shared/feature-ui";
export default function PeerReviewScreen() {
  const [submissionId, setSubmissionId] = useState<string | undefined>();
  const [body, setBody] = useState("");
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const r = useResource(
    useCallback(() => community.submission(submissionId), [submissionId]),
  );
  const a = useAction();
  const s = r.data?.submission;
  const service = useMemo(() => postFeed("reviews", s?.id ?? ""), [s?.id]);
  // Keep the same submission after posting so a successful review doesn't unexpectedly navigate.
  const refreshCurrent = async () => {
    if (s && !submissionId) setSubmissionId(s.id);
    else await r.refresh();
  };
  return (
    <Page title="Peer review" back>
      <ResourceState resource={r} />
      <ActionState action={a} />
      {s && (
        <>
          <Heading>{s.title}</Heading>
          <Copy>{s.authorLabel}</Copy>
          <Card>
            <Copy>{s.prompt}</Copy>
            <Copy>{s.body}</Copy>
          </Card>
          <Copy>{r.data?.remaining} samples still need your feedback.</Copy>
          <View style={ui.row}>
            <Button
              label="Refresh"
              disabled={a.busy || r.loading}
              onPress={() => void r.refresh()}
            />
            <Button
              label="Next suggested sample"
              disabled={a.busy}
              onPress={() => {
                if (submissionId) setSubmissionId(undefined);
                else void r.refresh();
              }}
            />
          </View>
          <TextInput
            accessibilityLabel="Review feedback"
            placeholder="Give constructive feedback…"
            style={ui.input}
            multiline
            value={body}
            maxLength={1000}
            onChangeText={setBody}
            editable={!a.busy}
          />
          <Button
            label="Send feedback"
            disabled={a.busy || !body.trim()}
            onPress={() =>
              void a.run(async () => {
                await service.create(body.trim());
                setBody("");
                await refreshCurrent();
              }, "Review submitted.")
            }
          />
          <Heading>Feedback</Heading>
          {!s.comments.length && <Empty />}
          {s.comments.map((c) => (
            <Card key={c.id}>
              <Copy>{c.author.displayName ?? "Learner"}</Copy>
              <Copy>{c.body}</Copy>
              <View style={ui.row}>
                {c.canEdit && (
                  <Button
                    label="Edit"
                    onPress={() =>
                      setEditor({
                        title: "Edit feedback",
                        fields: [
                          {
                            key: "body",
                            label: "Feedback",
                            value: c.body,
                            max: 1000,
                            required: true,
                            multiline: true,
                          },
                        ],
                        save: async (v) => {
                          await service.update(c.id, v.body);
                          await refreshCurrent();
                        },
                      })
                    }
                  />
                )}
                {c.canDelete && (
                  <Button
                    label="Delete"
                    danger
                    disabled={a.busy}
                    onPress={() =>
                      confirmAction(
                        "Delete feedback?",
                        c.body,
                        () =>
                          void a.run(async () => {
                            await service.remove(c.id);
                            await refreshCurrent();
                          }),
                      )
                    }
                  />
                )}
              </View>
            </Card>
          ))}
        </>
      )}
      <Editor spec={editor} close={() => setEditor(null)} />
    </Page>
  );
}
