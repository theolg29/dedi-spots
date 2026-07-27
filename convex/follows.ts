import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const follow = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const myId = await getAuthUserId(ctx);
    if (!myId) throw new Error("Non authentifié");
    if (myId === userId) throw new Error("Tu ne peux pas te suivre toi-même");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", myId).eq("followingId", userId)
      )
      .first();
    if (existing) return;

    await ctx.db.insert("follows", {
      followerId: myId,
      followingId: userId,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.notifications.create, {
      userId,
      actorId: myId,
      type: "follow",
    });
  },
});

export const unfollow = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const myId = await getAuthUserId(ctx);
    if (!myId) throw new Error("Non authentifié");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", myId).eq("followingId", userId)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const isFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const myId = await getAuthUserId(ctx);
    if (!myId) return false;

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", myId).eq("followingId", userId)
      )
      .first();
    return existing !== null;
  },
});

export const getFollowCounts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .take(10000);
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .take(10000);
    return { followers: followers.length, following: following.length };
  },
});
