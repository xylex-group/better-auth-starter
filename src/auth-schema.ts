import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

// Better Auth Core Schema
// Reference: https://www.better-auth.com/docs/concepts/database#core-schema
// Note: Property names are camelCase, but database columns are snake_case

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""), // Database requires NOT NULL, provide empty string default
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false), // Database uses snake_case
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }) // Database uses snake_case
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }) // Database uses snake_case
    .notNull()
    .defaultNow(),
  // Additional fields for SuitsBooks
  role: text("role").default("user"),
  // Note: organization_id and company_id are stored in Supabase users table, not in Better Auth user table
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id") // Database uses snake_case
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // Database uses snake_case
  ipAddress: text("ip_address"), // Database uses snake_case
  userAgent: text("user_agent"), // Database uses snake_case
  createdAt: timestamp("created_at", { withTimezone: true }) // Database uses snake_case
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }) // Database uses snake_case
    .notNull()
    .defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id") // Database uses snake_case
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(), // Database uses snake_case
  providerId: text("provider_id").notNull(), // Database uses snake_case
  accessToken: text("access_token"), // Database uses snake_case
  refreshToken: text("refresh_token"), // Database uses snake_case
  accessTokenExpiresAt: timestamp("access_token_expires_at", { // Database uses snake_case
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { // Database uses snake_case
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("id_token"), // Database uses snake_case
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }) // Database uses snake_case
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }) // Database uses snake_case
    .notNull()
    .defaultNow(),
}, (table) => ({
  providerAccount: uniqueIndex("provider_account_unique").on(
    table.providerId,
    table.accountId
  ),
}));

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // Database uses snake_case
  createdAt: timestamp("created_at", { withTimezone: true }) // Database uses snake_case
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }) // Database uses snake_case
    .notNull()
    .defaultNow(),
});

