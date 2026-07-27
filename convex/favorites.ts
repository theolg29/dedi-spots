import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

async function resolvePhoto(ctx: QueryCtx, photoId: string): Promise<string | null> {
  if (photoId.startsWith("http")) return photoId;
  try {
    return await ctx.storage.getUrl(photoId as Id<"_storage">);
  } catch {
    return null;
  }
}

// Add spot to favorites, optionally in a specific list
export const addToList = mutation({
  args: {
    spotId: v.id("spots"),
    listId: v.optional(v.id("favoriteLists")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_spot", (q) =>
        q.eq("userId", userId).eq("spotId", args.spotId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { listId: args.listId });
    } else {
      await ctx.db.insert("favorites", {
        userId,
        spotId: args.spotId,
        listId: args.listId,
        isPrivate: false,
        createdAt: Date.now(),
      });

      const spot = await ctx.db.get(args.spotId);
      if (spot) {
        await ctx.runMutation(internal.notifications.create, {
          userId: spot.creatorId,
          actorId: userId,
          type: "favorite",
          spotId: args.spotId,
        });
      }
    }
  },
});

// Remove spot from favorites entirely
export const remove = mutation({
  args: { spotId: v.id("spots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_spot", (q) =>
        q.eq("userId", userId).eq("spotId", args.spotId)
      )
      .first();

    if (existing) await ctx.db.delete(existing._id);
  },
});

// All favorited spot IDs for the current user (used in feed to show heart state)
export const getFavoritedIds = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [] as Id<"spots">[];
    const favs = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return favs.map((f) => f.spotId);
  },
});

// All user lists (for the bottom sheet)
export const getUserLists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("favoriteLists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

// Create a new list
export const createList = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    return await ctx.db.insert("favoriteLists", {
      userId,
      name: args.name.trim(),
      createdAt: Date.now(),
    });
  },
});

// Default bucket spots with resolved photos and ratings (for "Coups de coeurs" section)
export const getDefaultFavoriteSpots = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const defaultFavs = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    const filtered = defaultFavs.filter((f) => !f.listId);

    return await Promise.all(
      filtered.map(async (fav) => {
        const spot = await ctx.db.get(fav.spotId);
        if (!spot) return null;

        const photo = spot.photos[0] ? await resolvePhoto(ctx, spot.photos[0]) : null;

        const reviews = await ctx.db
          .query("reviews")
          .withIndex("by_spot", (q) => q.eq("spotId", spot._id))
          .take(100);
        const avgRating =
          reviews.length > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
            : 0;

        return {
          _id: spot._id,
          title: spot.title,
          tags: spot.tags,
          photo,
          avgRating,
          reviewCount: reviews.length,
        };
      })
    ).then((results) => results.filter((r): r is NonNullable<typeof r> => r !== null));
  },
});

// Spots inside a specific list (for the list detail screen)
export const getListSpots = query({
  args: { listId: v.id("favoriteLists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) return null;

    const favs = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const listFavs = favs.filter((f) => f.listId === args.listId);

    const spots = await Promise.all(
      listFavs.map(async (fav) => {
        const spot = await ctx.db.get(fav.spotId);
        if (!spot) return null;

        const photo = spot.photos[0] ? await resolvePhoto(ctx, spot.photos[0]) : null;

        const reviews = await ctx.db
          .query("reviews")
          .withIndex("by_spot", (q) => q.eq("spotId", spot._id))
          .take(100);
        const avgRating =
          reviews.length > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
            : 0;

        return {
          _id: spot._id,
          title: spot.title,
          tags: spot.tags,
          photo,
          avgRating,
          reviewCount: reviews.length,
        };
      })
    );

    return {
      name: list.name,
      spots: spots.filter((s): s is NonNullable<typeof s> => s !== null),
    };
  },
});

// Delete a list — spots inside fall back to the default "Favoris" bucket
// Rename a list
export const renameList = mutation({
  args: { listId: v.id("favoriteLists"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("Liste introuvable");

    await ctx.db.patch(args.listId, { name: args.name.trim() });
  },
});

export const deleteList = mutation({
  args: { listId: v.id("favoriteLists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) throw new Error("Liste introuvable");

    const favs = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(
      favs
        .filter((f) => f.listId === args.listId)
        .map((f) => ctx.db.patch(f._id, { listId: undefined }))
    );

    await ctx.db.delete(args.listId);
  },
});

// Overview for the favorites page: default bucket + all lists with counts and cover photos
export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const allFavs = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const lists = await ctx.db
      .query("favoriteLists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();

    // Default bucket (no listId)
    const defaultFavs = allFavs.filter((f) => !f.listId);
    let defaultCover: string | null = null;
    if (defaultFavs.length > 0) {
      const spot = await ctx.db.get(defaultFavs[0].spotId);
      if (spot?.photos[0]) defaultCover = await resolvePhoto(ctx, spot.photos[0]);
    }

    const listsData = await Promise.all(
      lists.map(async (list) => {
        const listFavs = allFavs.filter((f) => f.listId === list._id);
        let cover: string | null = null;
        if (listFavs.length > 0) {
          const spot = await ctx.db.get(listFavs[0].spotId);
          if (spot?.photos[0]) cover = await resolvePhoto(ctx, spot.photos[0]);
        }
        return {
          _id: list._id,
          name: list.name,
          count: listFavs.length,
          cover,
        };
      })
    );

    return {
      default: { count: defaultFavs.length, cover: defaultCover },
      lists: listsData,
    };
  },
});
