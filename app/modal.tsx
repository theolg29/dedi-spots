import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Colors, Fonts, Radius } from "@/constants/theme";

type Notification = {
  _id: string;
  type: "review" | "follow" | "favorite";
  read: boolean;
  createdAt: number;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  spotId: string | null;
  spotTitle: string | null;
};

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "à l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return new Date(timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function notificationText(n: Notification): string {
  switch (n.type) {
    case "review":
      return `${n.actorName} a laissé un avis sur ${n.spotTitle ?? "ton spot"}`;
    case "follow":
      return `${n.actorName} a commencé à te suivre`;
    case "favorite":
      return `${n.actorName} a ajouté ${n.spotTitle ?? "ton spot"} à ses favoris`;
  }
}

function notificationIcon(type: Notification["type"]): React.ComponentProps<typeof Octicons>["name"] {
  switch (type) {
    case "review":
      return "star-fill";
    case "follow":
      return "person";
    case "favorite":
      return "heart-fill";
  }
}

function NotificationRow({ notif }: { notif: Notification }) {
  const handlePress = () => {
    router.back();
    if (notif.spotId) {
      router.push(`/spot/${notif.spotId}`);
    } else {
      router.push({ pathname: "/user/[id]", params: { id: notif.actorId } });
    }
  };

  return (
    <Pressable style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} onPress={handlePress}>
      {notif.actorAvatarUrl ? (
        <Image source={{ uri: notif.actorAvatarUrl }} style={s.avatar} contentFit="cover" />
      ) : (
        <View style={[s.avatar, s.avatarFallback]}>
          <Text style={s.avatarLetter}>{notif.actorName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={s.rowIconBadge}>
        <Octicons name={notificationIcon(notif.type)} size={11} color="#fff" />
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowText}>{notificationText(notif)}</Text>
        <Text style={s.rowTime}>{formatRelativeTime(notif.createdAt)}</Text>
      </View>
      {!notif.read && <View style={s.unreadDot} />}
    </Pressable>
  );
}

export default function NotificationsModal() {
  const notifications = useQuery(api.notifications.list) as Notification[] | undefined;
  const markAllRead = useMutation(api.notifications.markAllRead);

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
        <Pressable
          style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Octicons name="x" size={20} color={Colors.text} />
        </Pressable>
      </View>

      {notifications === undefined && (
        <View style={s.empty}>
          <Text style={s.emptySub}>Chargement…</Text>
        </View>
      )}

      {notifications?.length === 0 && (
        <View style={s.empty}>
          <Octicons name="bell" size={36} color={Colors.muted} />
          <Text style={s.emptyTitle}>Aucune notification</Text>
          <Text style={s.emptySub}>Tu seras notifié quand quelqu&apos;un interagit avec tes spots.</Text>
        </View>
      )}

      {notifications && notifications.length > 0 && (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {notifications.map((notif) => (
            <NotificationRow key={notif._id} notif={notif} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  closeBtn: { padding: 4 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: { width: 44, height: 44, borderRadius: Radius.pill },
  avatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontFamily: Fonts.headingBold, fontSize: 16 },
  rowIconBadge: {
    position: "absolute",
    left: 30,
    top: 30,
    width: 18,
    height: 18,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
    lineHeight: 20,
  },
  rowTime: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    flexShrink: 0,
  },
});
