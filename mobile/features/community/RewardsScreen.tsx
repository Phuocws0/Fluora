import { useCallback } from "react";
import { View } from "react-native";
import { community } from "./community.service";
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
export default function RewardsScreen() {
  const r = useResource(
    useCallback(async () => {
      const [shop, history, wallet] = await Promise.all([
        community.rewards(),
        community.redemptions(),
        community.wallet(),
      ]);
      return { ...shop, ...history, wallet };
    }, []),
  );
  const a = useAction();
  return (
    <Page title="Reward shop" back>
      <ResourceState resource={r} />
      <ActionState action={a} />
      {r.data && (
        <>
          <Heading>💎 {r.data.balance} gems</Heading>
          <Copy>
            Earn gems through quests. Your balance and awards follow your
            learning activity.
          </Copy>
          <Button
            label="Refresh"
            disabled={a.busy || r.loading}
            onPress={() => void r.refresh()}
          />
          {!r.data.rewards.length && <Empty />}
          {r.data.rewards.map((reward) => (
            <Card key={reward.id}>
              <Heading>{reward.name}</Heading>
              <Copy>{reward.description}</Copy>
              <Copy>
                {reward.costGems} gems · {reward.fulfillment}
              </Copy>
              <Button
                label={reward.affordable ? "Redeem" : "More gems needed"}
                disabled={!reward.affordable || a.busy}
                onPress={() =>
                  confirmAction(
                    "Redeem reward?",
                    `Spend ${reward.costGems} gems on ${reward.name}?`,
                    () =>
                      void a.run(async () => {
                        await community.redeem(reward.id);
                        await r.refresh();
                      }, "Reward redeemed."),
                  )
                }
              />
            </Card>
          ))}
          <Heading>Your redemptions</Heading>
          {!r.data.redemptions.length && <Empty />}
          {r.data.redemptions.map((item) => (
            <Card key={item.id}>
              <Copy>
                {item.reward.name} · {item.costGems} gems
              </Copy>
              <Copy>{item.status}</Copy>
              {item.cancellable && (
                <Button
                  label="Cancel & refund"
                  danger
                  disabled={a.busy}
                  onPress={() =>
                    confirmAction(
                      "Cancel redemption?",
                      "The pending redemption will be cancelled and refunded once.",
                      () =>
                        void a.run(async () => {
                          await community.cancelRedemption(item.id);
                          await r.refresh();
                        }, "Redemption cancelled and refunded."),
                    )
                  }
                />
              )}
            </Card>
          ))}
          <Heading>Wallet activity</Heading>
          {!r.data.wallet.transactions.length && <Empty />}
          {r.data.wallet.transactions.map((t) => (
            <View key={t.id} style={ui.row}>
              <Copy>
                {t.amount > 0 ? "+" : ""}
                {t.amount} · {t.reason} ·{" "}
                {new Date(t.createdAt).toLocaleDateString()}
              </Copy>
            </View>
          ))}
        </>
      )}
    </Page>
  );
}
