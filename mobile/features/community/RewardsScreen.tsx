import { useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { community } from "./community.service";
import type { Reward } from "./community.types";
import {
  ActionState,
  Button,
  Card,
  Copy,
  Empty,
  Heading,
  ResourceState,
  confirmAction,
  ui,
  useAction,
  useResource,
} from "../shared/feature-ui";
import { font, garden, GardenSubtitle, Page as GardenPage } from "../profile/garden-ui";
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
  const primaryReward = r.data?.rewards[0];
  const redeem = (reward: Reward) => confirmAction(
    "Redeem reward?",
    `Spend ${reward.costGems} gems on ${reward.name}?`,
    () => void a.run(async () => {
      await community.redeem(reward.id);
      await r.refresh();
    }, "Reward redeemed."),
  );
  return (
    <GardenPage
      title="A little help to keep growing"
      eyebrow="YOUR PERSONAL SPACE"
      activeTab="League"
      action={primaryReward ? {
        label: primaryReward.name.toLowerCase().includes("streak") ? "Get streak protection" : `Get ${primaryReward.name}`,
        disabled: !primaryReward.affordable || a.busy,
        onPress: () => redeem(primaryReward),
      } : undefined}
    >
      <ResourceState resource={r} />
      <ActionState action={a} />
      {r.data && (
        <>
          <GardenSubtitle compact>Your wallet: {r.data.balance} gems</GardenSubtitle>
          <View style={styles.rewardLayout}>
            <View style={styles.walletPill}><Text style={styles.walletText}>WALLET / {r.data.balance} GEMS</Text></View>
            {r.data.rewards.slice(0, 4).map((reward, index) => <Pressable
              key={reward.id}
              accessibilityRole="button"
              accessibilityLabel={`${reward.name}, ${reward.costGems} gems`}
              accessibilityState={{ disabled: !reward.affordable || a.busy }}
              disabled={!reward.affordable || a.busy}
              onPress={() => redeem(reward)}
              style={[
                styles.rewardTile,
                index === 0 && styles.rewardFeature,
                index === 1 && styles.rewardTopRight,
                index === 2 && styles.rewardBottomRight,
                index === 3 && styles.rewardWide,
                index === 1 && styles.rewardBlue,
                index === 3 && styles.rewardBlue,
                !reward.affordable && styles.rewardUnavailable,
              ]}
            >
              <Text numberOfLines={2} style={styles.rewardName}>{reward.name}</Text>
              <Text style={styles.rewardCost}>{reward.costGems} gems</Text>
              {index === 0 && <Ionicons name="shield-checkmark" size={72} color={garden.forest} style={styles.rewardIcon} />}
            </Pressable>)}
            {!r.data.rewards.length && <View style={styles.noRewards}><Empty text="New rewards will appear here." /></View>}
          </View>
          {r.data.rewards.slice(4).map(reward => <Card key={reward.id}>
            <Heading>{reward.name}</Heading><Copy>{reward.description}</Copy>
            <Copy>{reward.costGems} gems · {reward.fulfillment}</Copy>
            <Button label={reward.affordable ? "Redeem" : "More gems needed"} disabled={!reward.affordable || a.busy} onPress={() => redeem(reward)} />
          </Card>)}
          <Button label="Refresh" disabled={a.busy || r.loading} onPress={() => void r.refresh()} />
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
    </GardenPage>
  );
}

const styles = StyleSheet.create({
  rewardLayout: { height: 450, position: "relative", width: "100%" },
  walletPill: { alignItems: "flex-start", backgroundColor: garden.mint, borderRadius: 18, height: 34, justifyContent: "center", left: 0, paddingHorizontal: 8, position: "absolute", top: 0, width: "100%" },
  walletText: { color: garden.forest, fontFamily: font.bold, fontSize: 11, lineHeight: 18 },
  rewardTile: { backgroundColor: garden.mint, borderRadius: 16, overflow: "hidden", padding: 14, position: "absolute" },
  rewardFeature: { height: 270, left: 0, top: 62, width: 190 },
  rewardTopRight: { height: 128, left: 202, top: 62, width: 140 },
  rewardBottomRight: { backgroundColor: "#f7faf6", height: 128, left: 202, top: 204, width: 140 },
  rewardWide: { height: 96, left: 0, top: 348, width: "100%" },
  rewardBlue: { backgroundColor: garden.blue },
  rewardUnavailable: { opacity: 0.8 },
  rewardName: { color: garden.forest, fontFamily: font.bold, fontSize: 15, lineHeight: 22 },
  rewardCost: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginTop: 6 },
  rewardIcon: { alignSelf: "center", marginTop: 22 },
  noRewards: { left: 0, position: "absolute", top: 62, width: "100%" },
});
