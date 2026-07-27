import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Appelé depuis d'autres mutations (addReview, follow, addToList) — jamais exposé au client.
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    actorId: v.id("users"),
    type: v.union(v.literal("review"), v.literal("follow"), v.literal("favorite")),
    spotId: v.optional(v.id("spots")),
  },
  handler: async (ctx, args) => {
    if (args.userId === args.actorId) return; // pas de notif sur ses propres actions
    await ctx.db.insert("notifications", {
      userId: args.userId,
      actorId: args.actorId,
      type: args.type,
      spotId: args.spotId,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return await Promise.all(
      notifs.map(async (n) => {
        const actor = await ctx.db.get(n.actorId);
        const actorProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", n.actorId))
          .first();
        const actorAvatarUrl = actorProfile?.avatarStorageId
          ? await ctx.storage.getUrl(actorProfile.avatarStorageId)
          : null;
        const spot = n.spotId ? await ctx.db.get(n.spotId) : null;

        return {
          _id: n._id,
          type: n.type,
          read: n.read,
          createdAt: n.createdAt,
          actorId: n.actorId,
          actorName: actor?.name ?? "Quelqu'un",
          actorAvatarUrl,
          spotId: n.spotId ?? null,
          spotTitle: spot?.title ?? null,
        };
      })
    );
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) => q.eq("userId", userId).eq("read", false))
      .take(100);
    return unread.length;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) => q.eq("userId", userId).eq("read", false))
      .take(100);
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});
