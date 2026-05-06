import { query } from "./_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
        return { ...spot, avgRating, reviewCount };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id("spots") },
  handler: async (ctx, args) => {
    const spot = await ctx.db.get(args.id);
    if (!spot) return null;

    const creator = await ctx.db.get(spot.creatorId);

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

    return { ...spot, creator, reviews: reviewsWithUser, avgRating, reviewCount };
  },
});
