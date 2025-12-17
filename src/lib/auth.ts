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

// Check better-auth docs for more info https://www.better-auth.com/docs/
// Determine if we should use __Secure- prefix for cookies
// The __Secure- prefix requires HTTPS and Secure flag
// For localhost/HTTP development, we need to disable it
const baseURL = process.env.BETTER_AUTH_URL || process.env.BASE_URL || "";
const isProduction = process.env.NODE_ENV === "production";
const isSecureOrigin = baseURL.startsWith("https://") || (!baseURL && isProduction);
const cookiePrefix = isSecureOrigin ? "__Secure-" : "";

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
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
			// Note: organization_id and company_id are stored in Supabase users table, not in Better Auth
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
	// Add your plugins here
	plugins: [
		openAPI(),
		multiSession(),
		bearer(),
		sso(),
		organization(),
		apiKey(),
		// emailOTP(),
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
							// If name is null or empty, set a default value before insertion
							if (!user.name || user.name.trim() === "") {
								// Set default name using email prefix or "User"
								user.name = user.email?.split("@")[0] || "User";
							}
							return user;
						},
					},
				},
			},
		},
	],
	// Advanced configuration
	advanced: {
		database: {
			generateId: () => randomUUID(),
		},
	},
	// DB config - Use Drizzle adapter to handle snake_case column mapping
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	// This is for the redis session storage
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

	onAPIError: {
		throw: true,
		onError: (err, ctx) => {
			console.error("better-auth error", ctx.path, err);
		},
	},
});
