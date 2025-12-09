import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

// Better Auth Core Schema
// Reference: https://www.better-auth.com/docs/concepts/database#core-schema
// Note: Property names are camelCase, but database columns are snake_case

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"), // Made optional - BetterAuth doesn't send name on email/password signup
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false), // Database uses camelCase
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }) // Database uses camelCase
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }) // Database uses camelCase
    .notNull()
    .defaultNow(),
  // Additional fields for SuitsBooks
  role: text("role").default("user"),
  organization_id: text("organization_id"),
  company_id: text("company_id"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId") // Database uses camelCase - check your actual schema
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(), // Database uses camelCase
  ipAddress: text("ipAddress"), // Database uses camelCase
  userAgent: text("userAgent"), // Database uses camelCase
  createdAt: timestamp("createdAt", { withTimezone: true }) // Database uses camelCase
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }) // Database uses camelCase
    .notNull()
    .defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId") // Database uses camelCase - check your actual schema
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(), // Database uses camelCase
  providerId: text("providerId").notNull(), // Database uses camelCase
  accessToken: text("accessToken"), // Database uses camelCase
  refreshToken: text("refreshToken"), // Database uses camelCase
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { // Database uses camelCase
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { // Database uses camelCase
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("idToken"), // Database uses camelCase
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true }) // Database uses camelCase
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }) // Database uses camelCase
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
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(), // Database uses camelCase
  createdAt: timestamp("createdAt", { withTimezone: true }) // Database uses camelCase
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }) // Database uses camelCase
    .notNull()
    .defaultNow(),
});

