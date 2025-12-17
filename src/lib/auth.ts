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
import { Redis } from "ioredis";
import { randomUUID } from "crypto";
import { db } from "../db";

const redis = new Redis(`${process.env.REDIS_URL}?family=0`)
	.on("error", (err) => {
		console.error("Redis connection error:", err);
	})
	.on("connect", () => {
		console.log("Redis connected");
	})
	.on("ready", () => {
		console.log("Redis ready");
	});

// Determine if we should use __Secure- prefix for cookies
const baseURL = process.env.BETTER_AUTH_URL || process.env.BASE_URL || "";
const isProduction = process.env.NODE_ENV === "production";
const isSecureOrigin = baseURL.startsWith("https://") || (!baseURL && isProduction);
const cookiePrefix = isSecureOrigin ? "__Secure-" : "";

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,

	logger: {
		level: "debug",
		log: (level, message, ...args) => {
			console.log(`[better-auth:${level}] ${message}`, ...args);
		},
	},

	onAPIError: {
		throw: true,
		onError: (error, ctx) => {
			console.error("better-auth api error", ctx.path, error);
		},
	},

	// Disable __Secure- prefix in development (localhost/HTTP)
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
			role: {
				type: "string",
				required: false,
				defaultValue: "user",
				input: false,
			},
		},
	},

	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
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
		openAPI(),
		multiSession(),
		bearer(),
		sso(),
		organization(),
		apiKey(),
		emailOTP(),
		username(),
		twoFactor(),
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
		database: {
			generateId: () => randomUUID(),
		},
	},

	database: drizzleAdapter(db, {
		provider: "pg",
	}),

	secondaryStorage: {
		get: async (key) => {
			const value = await redis.get(key);
			return value ? value : null;
		},
		set: async (key, value, ttl) => {
			if (ttl) {
				await redis.set(key, value, "EX", ttl);
			} else {
				await redis.set(key, value);
			}
		},
		delete: async (key) => {
			await redis.del(key);
		},
	},

	baseURL,
	trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) || [],
});
