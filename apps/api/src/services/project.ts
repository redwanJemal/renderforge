import {
  db, projects, projectSchedules, projectSocialAccounts,
  posts, niches, socialAccounts, renders,
  eq, and, count, desc, sql, inArray,
} from "@renderforge/db";
import type { ProjectStatus } from "@renderforge/shared";

export const projectService = {
  async list(filters: {
    status?: string;
    page?: number;
    perPage?: number;
  } = {}) {
    const { status, page = 1, perPage = 20 } = filters;
    const offset = (page - 1) * perPage;

    const conditions = [];
    if (status) conditions.push(eq(projects.status, status as ProjectStatus));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select().from(projects).where(where).limit(perPage).offset(offset).orderBy(desc(projects.createdAt)),
      db.select({ total: count() }).from(projects).where(where),
    ]);

    // Attach post counts and schedule counts per project
    if (items.length > 0) {
      const projectIds = items.map((p) => p.id);

      const [postCounts, scheduleCounts] = await Promise.all([
        db.select({ projectId: posts.projectId, cnt: count() })
          .from(posts)
          .where(inArray(posts.projectId, projectIds))
          .groupBy(posts.projectId),
        db.select({ projectId: projectSchedules.projectId, cnt: count() })
          .from(projectSchedules)
          .where(inArray(projectSchedules.projectId, projectIds))
          .groupBy(projectSchedules.projectId),
      ]);

      const postCountMap = new Map(postCounts.map((r) => [r.projectId, Number(r.cnt)]));
      const scheduleCountMap = new Map(scheduleCounts.map((r) => [r.projectId, Number(r.cnt)]));

      const itemsWithCounts = items.map((p) => ({
        ...p,
        postCount: postCountMap.get(p.id) ?? 0,
        scheduleCount: scheduleCountMap.get(p.id) ?? 0,
      }));

      return { items: itemsWithCounts, total, page, totalPages: Math.ceil(total / perPage) };
    }

    return { items: items.map((p) => ({ ...p, postCount: 0, scheduleCount: 0 })), total, page, totalPages: Math.ceil(total / perPage) };
  },

  async getById(id: string) {
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project) return null;

    const [schedules, socialAccountLinks, nicheCount] = await Promise.all([
      db.select().from(projectSchedules).where(eq(projectSchedules.projectId, id)),
      db.select({
        id: projectSocialAccounts.id,
        socialAccountId: projectSocialAccounts.socialAccountId,
        provider: socialAccounts.provider,
        accountName: socialAccounts.accountName,
      })
        .from(projectSocialAccounts)
        .innerJoin(socialAccounts, eq(projectSocialAccounts.socialAccountId, socialAccounts.id))
        .where(eq(projectSocialAccounts.projectId, id)),
      db.select({ cnt: count() }).from(niches).where(eq(niches.projectId, id)),
    ]);

    return {
      ...project,
      schedules,
      linkedSocialAccounts: socialAccountLinks,
      nicheCount: Number(nicheCount[0]?.cnt ?? 0),
    };
  },

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    socialHandles?: Record<string, string>;
    colorPalette?: Record<string, string>;
    defaultVoiceId?: string;
    status?: ProjectStatus;
  }) {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  },

  async update(id: string, data: Partial<{
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    socialHandles: Record<string, string>;
    colorPalette: Record<string, string>;
    defaultVoiceId: string | null;
    status: ProjectStatus;
  }>) {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project ?? null;
  },

  async delete(id: string) {
    const [project] = await db.delete(projects).where(eq(projects.id, id)).returning();
    return project ?? null;
  },

  // Schedules
  async getSchedules(projectId: string) {
    return db.select().from(projectSchedules).where(eq(projectSchedules.projectId, projectId));
  },

  async createSchedule(data: {
    projectId: string;
    templateId: string;
    format: string;
    theme?: string;
    postsPerDay?: number;
    daysOfWeek?: number[];
    autoRender?: boolean;
    enabled?: boolean;
  }) {
    const [schedule] = await db.insert(projectSchedules).values(data).returning();
    return schedule;
  },

  async updateSchedule(id: string, data: Partial<{
    templateId: string;
    format: string;
    theme: string | null;
    postsPerDay: number;
    daysOfWeek: number[];
    autoRender: boolean;
    enabled: boolean;
  }>) {
    const [schedule] = await db
      .update(projectSchedules)
      .set(data)
      .where(eq(projectSchedules.id, id))
      .returning();
    return schedule ?? null;
  },

  async deleteSchedule(id: string) {
    const [schedule] = await db.delete(projectSchedules).where(eq(projectSchedules.id, id)).returning();
    return schedule ?? null;
  },

  // Social Account Links
  async linkSocialAccount(projectId: string, socialAccountId: string) {
    const [link] = await db
      .insert(projectSocialAccounts)
      .values({ projectId, socialAccountId })
      .onConflictDoNothing()
      .returning();
    return link;
  },

  async unlinkSocialAccount(projectId: string, socialAccountId: string) {
    const [link] = await db
      .delete(projectSocialAccounts)
      .where(
        and(
          eq(projectSocialAccounts.projectId, projectId),
          eq(projectSocialAccounts.socialAccountId, socialAccountId),
        ),
      )
      .returning();
    return link ?? null;
  },

  // Project config for render injection
  async getProjectConfig(projectId: string) {
    const [project] = await db
      .select({
        logoUrl: projects.logoUrl,
        socialHandles: projects.socialHandles,
        colorPalette: projects.colorPalette,
        defaultVoiceId: projects.defaultVoiceId,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return project ?? null;
  },

  // Calendar data
  async getCalendarData(projectId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [schedules, monthPosts] = await Promise.all([
      db.select().from(projectSchedules)
        .where(and(eq(projectSchedules.projectId, projectId), eq(projectSchedules.enabled, true))),
      db.select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        templateId: posts.templateId,
        format: posts.format,
        createdAt: posts.createdAt,
      })
        .from(posts)
        .where(
          and(
            eq(posts.projectId, projectId),
            sql`${posts.createdAt} >= ${startDate}`,
            sql`${posts.createdAt} <= ${endDate}`,
          ),
        )
        .orderBy(posts.createdAt),
    ]);

    // Group posts by day
    const postsByDay: Record<number, typeof monthPosts> = {};
    for (const post of monthPosts) {
      const day = new Date(post.createdAt).getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(post);
    }

    // Calculate expected slots per day from schedule rules
    const daysInMonth = new Date(year, month, 0).getDate();
    const expectedByDay: Record<number, Array<{ templateId: string; format: string; count: number }>> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const daySlots: Array<{ templateId: string; format: string; count: number }> = [];

      for (const schedule of schedules) {
        if (schedule.daysOfWeek.includes(dayOfWeek)) {
          daySlots.push({
            templateId: schedule.templateId,
            format: schedule.format,
            count: schedule.postsPerDay,
          });
        }
      }

      if (daySlots.length > 0) {
        expectedByDay[d] = daySlots;
      }
    }

    // Fill rate
    let totalExpected = 0;
    let totalActual = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const expected = expectedByDay[d]?.reduce((sum, s) => sum + s.count, 0) ?? 0;
      totalExpected += expected;
      totalActual += (postsByDay[d]?.length ?? 0);
    }

    return {
      schedules,
      postsByDay,
      expectedByDay,
      fillRate: { totalExpected, totalActual, daysInMonth },
    };
  },
};
