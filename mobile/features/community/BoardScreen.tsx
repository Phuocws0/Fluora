import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { community } from "./community.service";
import type { BoardNote, Task } from "./community.types";
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
const colors = {
  yellow: "#fff4bb",
  green: "#eaf8de",
  blue: "#e0f0ff",
  pink: "#ffe4ef",
};
export default function BoardScreen({ groupId }: { groupId: string }) {
  const r = useResource(
    useCallback(
      async () => ({
        ...(await community.tasks(groupId)),
        ...(await community.notes(groupId)),
      }),
      [groupId],
    ),
  );
  const a = useAction();
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const taskEditor = (task?: Task) =>
    setEditor({
      title: task ? "Rename task" : "Add task",
      fields: [
        {
          key: "title",
          label: "Task",
          value: task?.title,
          max: 120,
          required: true,
        },
      ],
      save: async (v) => {
        if (task) await community.updateTask(groupId, task.id, v);
        else await community.createTask(groupId, v);
        await r.refresh();
      },
    });
  const noteEditor = (note?: BoardNote) =>
    setEditor({
      title: note ? "Edit / move note" : "Add note",
      fields: [
        {
          key: "text",
          label: "Note",
          value: note?.text,
          max: 280,
          required: true,
          multiline: true,
        },
        {
          key: "x",
          label: "X position (0–4000)",
          value: String(note?.x ?? 20),
          numeric: true,
        },
        {
          key: "y",
          label: "Y position (0–4000)",
          value: String(note?.y ?? 20),
          numeric: true,
        },
        {
          key: "color",
          label: "Color",
          value: note?.color,
          choices: Object.keys(colors),
        },
      ],
      save: async (v) => {
        const x = Number(v.x),
          y = Number(v.y);
        if (x < 0 || x > 4000 || y < 0 || y > 4000)
          throw new Error("Positions must be between 0 and 4000.");
        const body = { text: v.text, color: v.color, x, y };
        if (note) await community.updateNote(groupId, note.id, body);
        else await community.createNote(groupId, body);
        await r.refresh();
      },
    });
  return (
    <Page title="Group plan & whiteboard" back>
      <ResourceState resource={r} />
      <ActionState action={a} />
      <View style={ui.row}>
        <Button
          label="Refresh"
          disabled={a.busy || r.loading}
          onPress={() => void r.refresh()}
        />
        <Button label="Add task" onPress={() => taskEditor()} />
        <Button label="Add note" onPress={() => noteEditor()} />
      </View>
      {r.data && (
        <>
          {(["todo", "doing", "done"] as const).map((lane) => (
            <View key={lane}>
              <Heading>{lane.toUpperCase()}</Heading>
              {!r.data?.tasks.some((t) => t.lane === lane) && (
                <Empty text="No tasks in this lane." />
              )}
              {r.data?.tasks
                .filter((t) => t.lane === lane)
                .map((t) => (
                  <Card key={t.id}>
                    <Copy>{t.title}</Copy>
                    <Text style={ui.small}>
                      By {t.createdBy.displayName ?? "Learner"}
                    </Text>
                    <View style={ui.row}>
                      {(["todo", "doing", "done"] as const)
                        .filter((l) => l !== lane)
                        .map((target) => (
                          <Button
                            key={target}
                            label={`→ ${target}`}
                            disabled={a.busy}
                            onPress={() =>
                              void a.run(async () => {
                                await community.updateTask(groupId, t.id, {
                                  lane: target,
                                });
                                await r.refresh();
                              }, "Task moved.")
                            }
                          />
                        ))}
                      <Button
                        label="Move to top"
                        disabled={a.busy}
                        onPress={() =>
                          void a.run(async () => {
                            await community.updateTask(groupId, t.id, {
                              order: 0,
                            });
                            await r.refresh();
                          }, "Task order updated.")
                        }
                      />
                      {t.canEdit && (
                        <Button label="Rename" onPress={() => taskEditor(t)} />
                      )}
                      {t.canDelete && (
                        <Button
                          label="Delete"
                          danger
                          disabled={a.busy}
                          onPress={() =>
                            confirmAction(
                              "Delete task?",
                              t.title,
                              () =>
                                void a.run(async () => {
                                  await community.deleteTask(groupId, t.id);
                                  await r.refresh();
                                }),
                            )
                          }
                        />
                      )}
                    </View>
                  </Card>
                ))}
            </View>
          ))}
          <Heading>Shared whiteboard</Heading>
          <Copy>
            Scroll the board. Use Edit / move to change your note's text,
            position or color.
          </Copy>
          {!r.data.notes.length && <Empty text="No notes yet." />}
          <ScrollView horizontal nestedScrollEnabled>
            <View
              style={{
                width: Math.max(340, ...r.data.notes.map((n) => n.x + 240)),
                height: Math.max(200, ...r.data.notes.map((n) => n.y + 200)),
                backgroundColor: "#f5f8f4",
                borderRadius: 12,
              }}
            >
              {r.data.notes.map((n) => (
                <View
                  key={n.id}
                  style={{
                    position: "absolute",
                    left: n.x,
                    top: n.y,
                    width: 220,
                    padding: 12,
                    backgroundColor: colors[n.color],
                    borderRadius: 12,
                  }}
                >
                  <Copy>{n.text}</Copy>
                  <Text style={ui.small}>
                    {n.author.displayName ?? "Learner"}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          {r.data.notes.map((n) => (
            <Card key={n.id}>
              <Copy>{n.text}</Copy>
              <Copy>
                {n.color} · ({n.x}, {n.y})
              </Copy>
              <View style={ui.row}>
                {n.canEdit && (
                  <Button label="Edit / move" onPress={() => noteEditor(n)} />
                )}
                {n.canDelete && (
                  <Button
                    label="Delete note"
                    danger
                    disabled={a.busy}
                    onPress={() =>
                      confirmAction(
                        "Delete note?",
                        n.text,
                        () =>
                          void a.run(async () => {
                            await community.deleteNote(groupId, n.id);
                            await r.refresh();
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
