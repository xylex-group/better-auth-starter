import { pgTable, index, foreignKey, text, timestamp, unique, boolean, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const invitation = pgTable("invitation", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	email: text().notNull(),
	role: text(),
	status: text().notNull(),
	expiresAt: timestamp({ withTimezone: true }).notNull(),
	createdAt: timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	inviterId: text().notNull(),
	customer_id: text("customer_id"),
}, (table) => [
	index("invitation_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("invitation_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "invitation_organizationId_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.inviterId],
			foreignColumns: [user.id],
			name: "invitation_inviterId_fkey"
		}).onDelete("cascade"),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp({ withTimezone: true }),
	refreshTokenExpiresAt: timestamp({ withTimezone: true }),
	scope: text(),
	password: text(),
	createdAt: timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull(),
}, (table) => [
	index("account_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_fkey"
		}).onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ withTimezone: true }).notNull(),
	createdAt: timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const organization = pgTable("organization", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logo: text(),
	createdAt: timestamp({ withTimezone: true }).notNull(),
	metadata: text(),
}, (table) => [
	unique("organization_slug_key").on(table.slug),
]);

export const member = pgTable("member", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	userId: text().notNull(),
	role: text().notNull(),
	createdAt: timestamp({ withTimezone: true }).notNull(),
	customer_id: text("customer_id"),
}, (table) => [
	index("member_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("member_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "member_organizationId_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "member_userId_fkey"
		}).onDelete("cascade"),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: boolean().notNull(),
	image: text(),
	createdAt: timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	role: text(),
	banned: boolean(),
	banReason: text(),
	banExpires: timestamp({ withTimezone: true }),
	username: text(),
	displayUsername: text(),
	twoFactorEnabled: boolean().default(false).notNull(),
	twoFactorSecret: text(),
	twoFactorBackupCodes: text(),
}, (table) => [
	unique("user_email_key").on(table.email),
	unique("user_username_key").on(table.username),
	unique("user_username_unique").on(table.username),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp({ withTimezone: true }).notNull(),
	token: text().notNull(),
	createdAt: timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
	impersonatedBy: text(),
	activeOrganizationId: text(),
	twoFactorVerified: boolean(),
}, (table) => [
	index("session_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_fkey"
		}).onDelete("cascade"),
	unique("session_token_key").on(table.token),
]);

export const apikey = pgTable("apikey", {
	id: text().primaryKey().notNull(),
	name: text(),
	start: text(),
	prefix: text(),
	key: text().notNull(),
	userId: text().notNull(),
	refillInterval: integer(),
	refillAmount: integer(),
	lastRefillAt: timestamp({ withTimezone: true }),
	enabled: boolean(),
	rateLimitEnabled: boolean(),
	rateLimitTimeWindow: integer(),
	rateLimitMax: integer(),
	requestCount: integer(),
	remaining: integer(),
	lastRequest: timestamp({ withTimezone: true }),
	expiresAt: timestamp({ withTimezone: true }),
	createdAt: timestamp({ withTimezone: true }).notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull(),
	permissions: text(),
	metadata: text(),
}, (table) => [
	index("apikey_key_idx").using("btree", table.key.asc().nullsLast().op("text_ops")),
	index("apikey_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "apikey_userId_fkey"
		}).onDelete("cascade"),
]);

export const passkey = pgTable("passkey", {
	id: text().primaryKey().notNull(),
	name: text(),
	publicKey: text().notNull(),
	userId: text().notNull(),
	credentialId: text().notNull(),
	counter: integer().notNull(),
	deviceType: text().notNull(),
	backedUp: boolean().notNull(),
	transports: text(),
	createdAt: timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	aaguid: text(),
});

export const twoFactor = pgTable("twoFactor", {
	id: text().primaryKey().notNull(),
	secret: text().notNull(),
	backupCodes: text().notNull(),
	userId: text().notNull(),
}, (table) => [
	index("twoFactor_secret_idx").using("btree", table.secret.asc().nullsLast().op("text_ops")),
	index("twoFactor_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "twoFactor_userId_fkey"
		}).onDelete("cascade"),
]);

export const ssoProvider = pgTable("ssoProvider", {
	id: text().primaryKey().notNull(),
	issuer: text().notNull(),
	oidcConfig: text(),
	samlConfig: text(),
	userId: text().notNull(),
	providerId: text().notNull(),
	organizationId: text(),
	domain: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "ssoProvider_userId_fkey"
		}).onDelete("cascade"),
	unique("ssoProvider_providerId_key").on(table.providerId),
]);
