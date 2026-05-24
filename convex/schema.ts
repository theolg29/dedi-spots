import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  spots: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    description: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    photos: v.array(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
    creatorAnonymized: v.optional(v.boolean()),
  })
    .index("by_creator", ["creatorId"])
    .index("by_location", ["latitude", "longitude"]),

  reviews: defineTable({
    spotId: v.id("spots"),
    userId: v.id("users"),
    rating: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_spot", ["spotId"])
    .index("by_user", ["userId"])
    .index("by_spot_and_user", ["spotId", "userId"]),

  favoriteLists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  favorites: defineTable({
    userId: v.id("users"),
    spotId: v.id("spots"),
    listId: v.optional(v.id("favoriteLists")),
    isPrivate: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_spot", ["spotId"])
    .index("by_user_and_spot", ["userId", "spotId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    country: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
  })
    .index("by_user", ["userId"])
    .index("by_username", ["username"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_follower_and_following", ["followerId", "followingId"]),
});
