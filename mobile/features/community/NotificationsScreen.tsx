import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { community } from "./community.service";
import type { Notice } from "./community.types";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Empty,
  Heading,
  Page,
  ResourceState,
  confirmAction,
  ui,
  useAction,
  useResource,
} from "../shared/feature-ui";
import { formatUiDate, useAppLanguage } from "../i18n/i18n";
export default function NotificationsScreen() {
  const { language } = useAppLanguage();
  const r = useResource(useCallback(() => community.notices(), []));
  const a = useAction();
  const [older, setOlder] = useState<Notice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  useEffect(() => {
    setOlder([]);
    setCursor(r.data?.nextBefore ?? null);
  }, [r.data]);
  const items = [...(r.data?.notifications ?? []), ...older];
  return (
    <Page title="Notifications" back>
      <ResourceState resource={r} />
      <ActionState action={a} />
      {r.data && (
        <>
          <Heading>{r.data.unreadCount} unread</Heading>
          <View style={ui.row}>
            <Button
              label="Refresh"
              disabled={a.busy || r.loading}
              onPress={() => void r.refresh()}
            />
            <Button
              label="Read all"
              disabled={a.busy || r.data.unreadCount === 0}
              onPress={() =>
                void a.run(async () => {
                  await community.readAll();
                  await r.refresh();
                })
              }
            />
            <Button
              label="Clear all"
              danger
              disabled={a.busy || !items.length}
              onPress={() =>
                confirmAction(
                  "Clear notifications?",
                  "Your notification list will be deleted.",
                  () =>
                    void a.run(async () => {
                      await community.clearNotices();
                      await r.refresh();
                    }),
                )
              }
            />
          </View>
          {!items.length && <Empty text="You're all caught up." />}
          {items.map((n) => (
            <Card key={n.id}>
              <Heading>
                {n.read ? "" : "● "}
                {n.title}
              </Heading>
              <Copy>{n.body}</Copy>
              <Copy>{formatUiDate(n.createdAt, language, { dateStyle: "medium", timeStyle: "short" })}</Copy>
              <View style={ui.row}>
                <Button
                  label={n.read ? "Mark unread" : "Mark read"}
                  disabled={a.busy}
                  onPress={() =>
                    void a.run(async () => {
                      await community.readNotice(n);
                      await r.refresh();
                    })
                  }
                />
                <Button
                  label="Delete"
                  danger
                  disabled={a.busy}
                  onPress={() =>
                    confirmAction(
                      "Delete notification?",
                      n.title,
                      () =>
                        void a.run(async () => {
                          await community.deleteNotice(n.id);
                          await r.refresh();
                        }),
                    )
                  }
                />
              </View>
            </Card>
          ))}
          {cursor && (
            <Button
              label="Load older"
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  const page = await community.notices(cursor);
                  setOlder((v) => [
                    ...v,
                    ...page.notifications.filter(
                      (n) => !items.some((old) => old.id === n.id),
                    ),
                  ]);
                  setCursor(page.nextBefore);
                }, "")
              }
            />
          )}
        </>
      )}
    </Page>
  );
}
