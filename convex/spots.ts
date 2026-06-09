import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

async function resolvePhotos(ctx: QueryCtx, photos: string[]): Promise<string[]> {
  const results = await Promise.all(
    photos.map(async (id) => {
      if (id.startsWith("http")) return id;
      try {
        return await ctx.storage.getUrl(id as Id<"_storage">);
      } catch {
        return null;
      }
    })
  );
  return results.filter((url): url is string => url !== null);
}

async function withRating(ctx: QueryCtx, spotId: Id<"spots">) {
  const reviews = await ctx.db
    .query("reviews")
    .withIndex("by_spot", (q) => q.eq("spotId", spotId))
    .take(100);
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  return { avgRating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.db.query("spots").order("desc").take(30);
    return await Promise.all(
      spots.map(async (spot) => {
        const { avgRating, reviewCount } = await withRating(ctx, spot._id);
        const photoUrls = await resolvePhotos(ctx, spot.photos);
        return { ...spot, photos: photoUrls, avgRating, reviewCount };
      })
    );
  },
});

export const listForMap = query({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.db.query("spots").order("desc").take(100);
    return await Promise.all(
      spots.map(async (spot) => {
        const { avgRating, reviewCount } = await withRating(ctx, spot._id);
        const firstPhoto =
          spot.photos.length > 0
            ? spot.photos[0].startsWith("http")
              ? spot.photos[0]
              : await ctx.storage.getUrl(spot.photos[0] as Id<"_storage">)
            : null;
        return {
          _id: spot._id,
          title: spot.title,
          description: spot.description,
          latitude: spot.latitude,
          longitude: spot.longitude,
          tags: spot.tags,
          photo: firstPhoto ?? undefined,
          avgRating,
          reviewCount,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    photos: v.array(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    return await ctx.db.insert("spots", {
      creatorId: userId,
      title: args.title,
      description: args.description,
      latitude: args.latitude,
      longitude: args.longitude,
      photos: args.photos,
      tags: args.tags,
      createdAt: Date.now(),
    });
  },
});

export const getUserReview = query({
  args: { spotId: v.id("spots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("reviews")
      .withIndex("by_spot_and_user", (q) =>
        q.eq("spotId", args.spotId).eq("userId", userId)
      )
      .unique();
  },
});

export const addReview = mutation({
  args: {
    spotId: v.id("spots"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_spot_and_user", (q) =>
        q.eq("spotId", args.spotId).eq("userId", userId)
      )
      .unique();
    if (existing) throw new Error("Avis déjà laissé pour ce spot");
    return await ctx.db.insert("reviews", {
      spotId: args.spotId,
      userId,
      rating: args.rating,
      comment: args.comment ?? undefined,
      createdAt: Date.now(),
    });
  },
});

export const getById = query({
  args: { id: v.id("spots") },
  handler: async (ctx, args) => {
    const spot = await ctx.db.get(args.id);
    if (!spot) return null;

    const creatorUser = await ctx.db.get(spot.creatorId);
    const creatorProfile = creatorUser
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", spot.creatorId))
          .first()
      : null;
    let creatorAvatarUrl: string | null = null;
    if (creatorProfile?.avatarStorageId) {
      creatorAvatarUrl = await ctx.storage.getUrl(creatorProfile.avatarStorageId);
    }
    const creator = creatorUser
      ? { ...creatorUser, avatarUrl: creatorAvatarUrl ?? creatorUser.image ?? null }
      : null;

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_spot", (q) => q.eq("spotId", args.id))
      .order("desc")
      .take(20);

    const reviewsWithUser = await Promise.all(
      reviews.map(async (review) => {
        const user = await ctx.db.get(review.userId);
        return { ...review, user };
      })
    );

    const { avgRating, reviewCount } = await withRating(ctx, args.id);

    const photoUrls = await resolvePhotos(ctx, spot.photos);

    return { ...spot, photos: photoUrls, creator, reviews: reviewsWithUser, avgRating, reviewCount };
  },
});

export const mySpots = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const spots = await ctx.db
      .query("spots")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .collect();
    return await Promise.all(
      spots.map(async (spot) => {
        const { avgRating, reviewCount } = await withRating(ctx, spot._id);
        const firstPhoto =
          spot.photos.length > 0
            ? spot.photos[0].startsWith("http")
              ? spot.photos[0]
              : await ctx.storage.getUrl(spot.photos[0] as Id<"_storage">)
            : null;
        return {
          _id: spot._id,
          title: spot.title,
          tags: spot.tags,
          photo: firstPhoto ?? null,
          avgRating,
          reviewCount,
        };
      })
    );
  },
});

export const myVisitedSpots = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const results = await Promise.all(
      reviews.map(async (review) => {
        const spot = await ctx.db.get(review.spotId);
        if (!spot) return null;
        const { avgRating, reviewCount } = await withRating(ctx, spot._id);
        const firstPhoto =
          spot.photos.length > 0
            ? spot.photos[0].startsWith("http")
              ? spot.photos[0]
              : await ctx.storage.getUrl(spot.photos[0] as Id<"_storage">)
            : null;
        return {
          _id: spot._id,
          title: spot.title,
          tags: spot.tags,
          photo: firstPhoto ?? null,
          avgRating,
          reviewCount,
        };
      })
    );
    return results.filter(
      (s): s is { _id: Id<"spots">; title: string; tags: string[]; photo: string | null; avgRating: number; reviewCount: number } =>
        s !== null
    );
  },
});
