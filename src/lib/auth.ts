import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { 
	openAPI,
	multiSession,
	bearer,
	organization,
	apiKey,
	emailOTP,
	username,
	twoFactor,
	admin,
} from "better-auth/plugins";
import { sso } from "better-auth/plugins/sso";
import { passkey } from "better-auth/plugins/passkey";
import { expo } from "@better-auth/expo";
import { Redis } from "ioredis";
import { db } from "../db";

const redis = new Redis(`${process.env.REDIS_URL}?family=0`)
   .on("error", (err) => console.error("Redis connection error:", err))
   .on("connect", () => console.log("Redis connected"))
   .on("ready", () => console.log("Redis ready"));

// Use BASE_URL explicitly for dev + production
const baseURL = process.env.BASE_URL || "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";
const isSecureOrigin = baseURL.startsWith("https://") || (!baseURL && isProduction);
const cookiePrefix = isSecureOrigin ? "__Secure-" : "";

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	cookiePrefix,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	user: {
		fields: {
			name: "name",
			email: "email",
			emailVerified: "emailVerified",
			image: "image",
			createdAt: "createdAt",
			updatedAt: "updatedAt",
		},
		additionalFields: {
			role: { type: "string", required: false, defaultValue: "user", input: false },
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: { enabled: true, maxAge: 5 * 60 },
		fields: {
			id: "id",
			userId: "userId",
			token: "token",
			expiresAt: "expiresAt",
			ipAddress: "ipAddress",
			userAgent: "userAgent",
			createdAt: "createdAt",
			updatedAt: "updatedAt",
		},
	},
	account: {
		fields: {
			id: "id",
			userId: "userId",
			accountId: "accountId",
			providerId: "providerId",
			accessToken: "accessToken",
			refreshToken: "refreshToken",
			accessTokenExpiresAt: "accessTokenExpiresAt",
			refreshTokenExpiresAt: "refreshTokenExpiresAt",
			scope: "scope",
			idToken: "idToken",
			password: "password",
			createdAt: "createdAt",
			updatedAt: "updatedAt",
		},
	},
	plugins: [
		expo(),
		openAPI(),
		multiSession(),
		bearer(),
		sso(),
		organization(),
		apiKey(),
		emailOTP(),
		username(),
		twoFactor({ issuer: "SuitsBooks" }),
		admin(),
		passkey(),
		{
			id: "set-default-name",
			hooks: {
				user: {
					created: {
						before: async (user) => {
							if (!user.name || user.name.trim() === "") {
								user.name = user.email?.split("@")[0] || "User";
							}
							return user;
						},
					},
				},
			},
		},
	],
	advanced: {
		database: { generateId: () => crypto.randomUUID() },
	},
	database: drizzleAdapter(db, { provider: "pg" }),
	secondaryStorage: {
		get: async (key) => {
			const value = await redis.get(key);
			return value ?? null;
		},
		set: async (key, value, ttl) => {
			if (ttl) await redis.set(key, value, "EX", ttl);
			else await redis.set(key, value);
		},
		delete: async (key) => await redis.del(key),
	},
	baseURL,
	trustedOrigins: [
		...(process.env.TRUSTED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) || []),
		"https://suitsbooks.app",
		"https://app.suitsbooks.com",
		"suitsbooks://",
		"suitsbooks://*",
		...(process.env.NODE_ENV === "development"
			? [
				"exp://*/*",
				"exp://10.0.0.*:*/*",
				"exp://192.168.*.*:*/*",
				"exp://172.*.*.*:*/*",
				"exp://localhost:*/*",
			]
			: []),
	],
});
