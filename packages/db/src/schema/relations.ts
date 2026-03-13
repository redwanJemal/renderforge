import { relations } from "drizzle-orm";
import { users } from "./users";
import { niches } from "./niches";
import { posts } from "./posts";
import { scenes } from "./scenes";
import { bgmTracks } from "./bgm-tracks";
import { renders } from "./renders";
import { socialAccounts } from "./social-accounts";
import { scheduledPosts } from "./scheduled-posts";
import { analytics } from "./analytics";

export const usersRelations = relations(users, ({ many }) => ({
  socialAccounts: many(socialAccounts),
}));

export const nichesRelations = relations(niches, ({ many }) => ({
  posts: many(posts),
  bgmTracks: many(bgmTracks),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  niche: one(niches, { fields: [posts.nicheId], references: [niches.id] }),
  scenes: many(scenes),
  renders: many(renders),
  scheduledPosts: many(scheduledPosts),
}));

export const scenesRelations = relations(scenes, ({ one }) => ({
  post: one(posts, { fields: [scenes.postId], references: [posts.id] }),
}));

export const bgmTracksRelations = relations(bgmTracks, ({ one }) => ({
  niche: one(niches, { fields: [bgmTracks.nicheId], references: [niches.id] }),
}));

export const rendersRelations = relations(renders, ({ one, many }) => ({
  post: one(posts, { fields: [renders.postId], references: [posts.id] }),
  bgmTrack: one(bgmTracks, { fields: [renders.bgmTrackId], references: [bgmTracks.id] }),
  scheduledPosts: many(scheduledPosts),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one, many }) => ({
  user: one(users, { fields: [socialAccounts.userId], references: [users.id] }),
  scheduledPosts: many(scheduledPosts),
}));

export const scheduledPostsRelations = relations(scheduledPosts, ({ one, many }) => ({
  post: one(posts, { fields: [scheduledPosts.postId], references: [posts.id] }),
  render: one(renders, { fields: [scheduledPosts.renderId], references: [renders.id] }),
  socialAccount: one(socialAccounts, { fields: [scheduledPosts.socialAccountId], references: [socialAccounts.id] }),
  analytics: many(analytics),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  scheduledPost: one(scheduledPosts, { fields: [analytics.scheduledPostId], references: [scheduledPosts.id] }),
}));
