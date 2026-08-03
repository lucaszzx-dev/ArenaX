import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const championshipEntryType = pgEnum("championship_entry_type", [
  "INDIVIDUAL",
  "TEAM"
]);

export const championshipStatus = pgEnum("championship_status", [
  "DRAFT",
  "PUBLISHED",
  "FINISHED"
]);

export const tournamentFormat = pgEnum("tournament_format", [
  "LEAGUE",
  "KNOCKOUT"
]);

export const matchStatus = pgEnum("match_status", [
  "SCHEDULED",
  "FINISHED",
  "CANCELED"
]);

export const lineupRole = pgEnum("lineup_role", [
  "STARTER",
  "SUBSTITUTE"
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  ...timestamps
});

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    uniqueIndex("oauth_provider_account_unique").on(
      table.provider,
      table.providerAccountId
    )
  ]
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const championships = pgTable(
  "championships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    sport: text("sport").notNull(),
    description: text("description"),
    entryType: championshipEntryType("entry_type").notNull(),
    status: championshipStatus("status").notNull().default("DRAFT"),
    format: tournamentFormat("format").notNull().default("LEAGUE"),
    winPoints: integer("win_points").notNull().default(3),
    drawPoints: integer("draw_points").notNull().default(1),
    lossPoints: integer("loss_points").notNull().default(0),
    allowsDraw: boolean("allows_draw").notNull().default(true),
    bestOfSets: integer("best_of_sets").notNull().default(5),
    maxYellowCards: integer("max_yellow_cards").notNull().default(0),
    thirdPlace: boolean("third_place").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    check(
      "championship_dates_order",
      sql`${table.endsAt} is null or ${table.startsAt} is null or ${table.endsAt} >= ${table.startsAt}`
    ),
    check(
      "championship_points_non_negative",
      sql`${table.winPoints} >= 0 and ${table.drawPoints} >= 0 and ${table.lossPoints} >= 0`
    )
  ]
);

export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shortName: text("short_name"),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    homeKit: text("home_kit"),
    awayKit: text("away_kit"),
    ...timestamps
  },
  (table) => [
    unique("clubs_owner_name_unique").on(table.ownerId, table.name)
  ]
);


export const clubSeasons = pgTable(
  "club_seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    unique("club_seasons_club_name_unique").on(table.clubId, table.name),
    check(
      "club_season_dates_order",
      sql`${table.endsAt} is null or ${table.startsAt} is null or ${table.endsAt} >= ${table.startsAt}`
    )
  ]
);

export const clubSquads = pgTable(
  "club_squads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    sport: text("sport"),
    seasonId: uuid("season_id").references(() => clubSeasons.id, {
      onDelete: "set null"
    }),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps
  },
  (table) => [
    unique("club_squads_club_name_unique").on(table.clubId, table.name)
  ]
);

export const clubSquadMembers = pgTable(
  "club_squad_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    squadId: uuid("squad_id")
      .notNull()
      .references(() => clubSquads.id, { onDelete: "cascade" }),
    clubMemberId: uuid("club_member_id")
      .notNull()
      .references(() => clubMembers.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("PLAYER"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    unique("club_squad_members_squad_member_unique").on(
      table.squadId,
      table.clubMemberId
    )
  ]
);

export const clubStaff = pgTable(
  "club_staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    unique("club_staff_club_name_unique").on(table.clubId, table.displayName)
  ]
);

export const clubAuditLogs = pgTable("club_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").notNull().references(() => users.id, {
    onDelete: "restrict"
  }),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
export const clubMembers = pgTable("club_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  jerseyNumber: integer("jersey_number"),
  position: text("position"),
  isCaptain: boolean("is_captain").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shortName: text("short_name"),
    logoUrl: text("logo_url"),
    sourceClubId: uuid("source_club_id").references(() => clubs.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    unique("teams_championship_name_unique").on(
      table.championshipId,
      table.name
    ),
    unique("teams_championship_source_club_unique").on(
      table.championshipId,
      table.sourceClubId
    )
  ]
);

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  sourceClubMemberId: uuid("source_club_member_id").references(
    () => clubMembers.id,
    { onDelete: "set null" }
  ),
  displayName: text("display_name").notNull(),
  jerseyNumber: integer("jersey_number"),
  position: text("position"),
  isCaptain: boolean("is_captain").notNull().default(false),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "set null"
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const championshipEntries = pgTable(
  "championship_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    kind: championshipEntryType("kind").notNull(),
    displayName: text("display_name").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "cascade"
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    unique("championship_entries_name_unique").on(
      table.championshipId,
      table.displayName
    ),
    check(
      "championship_entry_subject_matches_kind",
      sql`(${table.kind} = 'TEAM' and ${table.teamId} is not null and ${table.userId} is null) or (${table.kind} = 'INDIVIDUAL' and ${table.teamId} is null)`
    )
  ]
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    homeEntryId: uuid("home_entry_id")
      .notNull()
      .references(() => championshipEntries.id, { onDelete: "restrict" }),
    awayEntryId: uuid("away_entry_id")
      .notNull()
      .references(() => championshipEntries.id, { onDelete: "restrict" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    status: matchStatus("status").notNull().default("SCHEDULED"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    roundNumber: integer("round_number"),
    generated: boolean("generated").notNull().default(false),
    venue: text("venue"),
    referee: text("referee"),
    operationalNotes: text("operational_notes"),
    mvpId: uuid("mvp_id"),
    ...timestamps
  },
  (table) => [
    check("match_distinct_entries", sql`${table.homeEntryId} <> ${table.awayEntryId}`),
    check(
      "match_round_number_positive",
      sql`${table.roundNumber} is null or ${table.roundNumber} > 0`
    ),
    check(
      "match_scores_non_negative",
      sql`(${table.homeScore} is null or ${table.homeScore} >= 0) and (${table.awayScore} is null or ${table.awayScore} >= 0)`
    )
  ]
);

export const matchLineups = pgTable(
  "match_lineups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => championshipEntries.id, { onDelete: "cascade" }),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMembers.id, { onDelete: "cascade" }),
    role: lineupRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    unique("match_lineups_member_unique").on(table.matchId, table.teamMemberId)
  ]
);

export const knockoutNodes = pgTable(
  "knockout_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    position: integer("position").notNull(),
    homeEntryId: uuid("home_entry_id").references(() => championshipEntries.id, {
      onDelete: "restrict"
    }),
    awayEntryId: uuid("away_entry_id").references(() => championshipEntries.id, {
      onDelete: "restrict"
    }),
    matchId: uuid("match_id").references(() => matches.id, {
      onDelete: "set null"
    }),
    ...timestamps
  },
  (table) => [
    unique("knockout_nodes_round_position_unique").on(
      table.championshipId,
      table.roundNumber,
      table.position
    ),
    unique("knockout_nodes_match_unique").on(table.matchId),
    check("knockout_node_round_positive", sql`${table.roundNumber} > 0`),
    check("knockout_node_position_positive", sql`${table.position} > 0`)
  ]
);

export const matchPeriods = pgTable(
  "match_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    periodNumber: integer("period_number").notNull(),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    ...timestamps
  },
  (table) => [
    unique("match_periods_match_number_unique").on(
      table.matchId,
      table.periodNumber
    ),
    check("match_period_number_positive", sql`${table.periodNumber} > 0`),
    check(
      "match_period_scores_non_negative",
      sql`${table.homeScore} >= 0 and ${table.awayScore} >= 0`
    )
  ]
);

export const matchAuditLogs = pgTable("match_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id").notNull().references(() => matches.id, {
    onDelete: "cascade"
  }),
  actorId: uuid("actor_id").notNull().references(() => users.id, {
    onDelete: "restrict"
  }),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const matchEvents = pgTable(
  "match_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => championshipEntries.id, { onDelete: "cascade" }),
    teamMemberId: uuid("team_member_id").references(() => teamMembers.id, {
      onDelete: "set null"
    }),
    actorName: text("actor_name"),
    type: text("type").notNull(),
    value: integer("value").notNull().default(1),
    periodNumber: integer("period_number"),
    clockSeconds: integer("clock_seconds"),
    notes: text("notes"),
    relatedEventId: uuid("related_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    check("match_event_value_positive", sql`${table.value} > 0`),
    check(
      "match_event_period_positive",
      sql`${table.periodNumber} is null or ${table.periodNumber} > 0`
    ),
    check(
      "match_event_clock_non_negative",
      sql`${table.clockSeconds} is null or ${table.clockSeconds} >= 0`
    )
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    link: text("link").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    dedupKey: text("dedup_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    uniqueIndex("notifications_user_dedup_unique").on(
      table.userId,
      table.dedupKey
    ),
    index("notifications_user_created_idx").on(
      table.userId,
      table.createdAt
    )
  ]
);

