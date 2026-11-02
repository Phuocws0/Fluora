import { useCallback, useState } from "react";
import { router } from "expo-router";
import { TextInput, View } from "react-native";
import { community } from "./community.service";
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
  ui,
  useAction,
  useResource,
  type EditorSpec,
} from "../shared/feature-ui";
export default function GroupsScreen() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const r = useResource(
    useCallback(() => community.groups(search, mine), [search, mine]),
  );
  const a = useAction();
  return (
    <Page title="Study groups" back>
      <Copy>Share a goal. Make progress together.</Copy>
      <TextInput
        accessibilityLabel="Search groups"
        placeholder="Search groups"
        style={ui.input}
        value={query}
        onChangeText={setQuery}
        maxLength={60}
      />
      <View style={ui.row}>
        <Button label="Search" onPress={() => setSearch(query.trim())} />
        <Button
          label={mine ? "✓ My groups" : "All groups"}
          onPress={() => setMine(!mine)}
        />
        <Button
          label="Refresh"
          disabled={r.loading}
          onPress={() => void r.refresh()}
        />
        <Button
          label="Create group"
          onPress={() =>
            setEditor({
              title: "Create a study group",
              fields: [
                { key: "name", label: "Name", required: true, min: 3, max: 60 },
                { key: "goal", label: "Shared goal", max: 200, required: true },
                {
                  key: "topic",
                  label: "Topic slug (e.g. english)",
                  required: true,
                  max: 50,
                },
                {
                  key: "visibility",
                  label: "Visibility",
                  choices: ["public", "private"],
                },
              ],
              save: async (v) => {
                const result = await community.createGroup(v);
                setEditor(null);
                router.push({
                  pathname: "/community/groups/[groupId]",
                  params: { groupId: result.group.id },
                });
              },
            })
          }
        />
      </View>
      <ResourceState resource={r} />
      <ActionState action={a} />
      {r.data && (
        <>
          {!r.data.groups.length && (
            <Empty text="No matching groups. Create one to get started." />
          )}
          {r.data.groups.map((g) => (
            <Card key={g.id}>
              <Heading>{g.name}</Heading>
              <Copy>{g.goal}</Copy>
              <Copy>
                {g.memberCount} members · {g.visibility} ·{" "}
                {g.myRole ?? "not joined"}
              </Copy>
              <View style={ui.row}>
                <Button
                  label="Open group"
                  onPress={() =>
                    router.push({
                      pathname: "/community/groups/[groupId]",
                      params: { groupId: g.id },
                    })
                  }
                />
                {!g.myRole && g.visibility === "public" && (
                  <Button
                    label="Join"
                    disabled={a.busy}
                    onPress={() =>
                      void a.run(async () => {
                        await community.joinGroup(g.id);
                        await r.refresh();
                      }, "Joined group.")
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
