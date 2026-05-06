import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return { user, profile };
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    username: v.string(),
    country: v.string(),
  },
  handler: async (ctx, { firstName, lastName, username, country }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const normalized = username.toLowerCase().trim();

    const myProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const taken = await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", normalized))
      .first();
    if (taken && taken._id !== myProfile?._id) throw new Error("Ce pseudo est déjà pris.");

    const data = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: normalized,
      country: country.trim(),
    };

    if (myProfile) {
      await ctx.db.patch(myProfile._id, data);
    } else {
      await ctx.db.insert("userProfiles", { userId, ...data });
    }
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    // Anonymize spots
    const spots = await ctx.db
      .query("spots")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .take(100);
    for (const spot of spots) {
      await ctx.db.patch(spot._id, { creatorAnonymized: true });
    }

    // Delete app data
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);
    for (const review of reviews) {
      await ctx.db.delete(review._id);
    }

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);
    for (const fav of favorites) {
      await ctx.db.delete(fav._id);
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile) await ctx.db.delete(profile._id);

    // Delete auth sessions + their refresh tokens
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .take(100);
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .take(100);
      for (const token of tokens) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(session._id);
    }

    // Delete auth accounts + their verification codes
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .take(100);
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .take(100);
      for (const code of codes) {
        await ctx.db.delete(code._id);
      }
      await ctx.db.delete(account._id);
    }

    // Finally delete the user document
    await ctx.db.delete(userId);
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const checkUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", username.toLowerCase()))
      .first();
    return existing !== null;
  },
});

export const createProfile = mutation({
  args: {
    username: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    country: v.string(),
  },
  handler: async (ctx, { username, firstName, lastName, country }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const normalizedUsername = username.toLowerCase();

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();
    if (existing) throw new Error("Ce pseudo est déjà pris.");

    const alreadyHasProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (alreadyHasProfile) return;

    await ctx.db.insert("userProfiles", {
      userId,
      username: normalizedUsername,
      firstName,
      lastName,
      country,
    });

    const user = await ctx.db.get(userId);
    if (user?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
        email: user.email,
        name: firstName,
      });
    }
  },
});
