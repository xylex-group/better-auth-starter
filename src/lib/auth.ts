import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { Redis } from "ioredis";
import { db } from "../db";

const redis = new Redis(`${process.env.REDIS_URL}?family=0`)
   .on("error", (err) => {
     console.error("Redis connection error:", err)
   })
   .on("connect", () => {
     console.log("Redis connected")
   })
  .on("ready", () => {
     console.log("Redis ready")
   })

// Check better-auth docs for more info https://www.better-auth.com/docs/
export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	// User configuration to match main app schema
	user: {
		// Explicit field mappings for camelCase -> snake_case
		fields: {
			name: "name",
			email: "email",
			emailVerified: "email_verified",
			image: "image",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
		additionalFields: {
			role: {
				type: "string",
				required: false,
				defaultValue: "user",
				input: false,
			},
			organization_id: {
				type: "string",
				required: false,
			},
			company_id: {
				type: "string",
				required: false,
			},
		},
	},
	// Session config
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // Update session every 24 hours
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
		// Explicit field mappings for camelCase -> snake_case
		fields: {
			id: "id",
			userId: "user_id",
			token: "token",
			expiresAt: "expires_at",
			ipAddress: "ip_address",
			userAgent: "user_agent",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	// Account field mappings
	account: {
		fields: {
			id: "id",
			userId: "user_id",
			accountId: "account_id",
			providerId: "provider_id",
			accessToken: "access_token",
			refreshToken: "refresh_token",
			accessTokenExpiresAt: "access_token_expires_at",
			refreshTokenExpiresAt: "refresh_token_expires_at",
			scope: "scope",
			idToken: "id_token",
			password: "password",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	// Add your plugins here
	plugins: [openAPI()],
	// Advanced configuration
	advanced: {
		database: {
			generateId: () => crypto.randomUUID(),
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
	baseURL: process.env.BETTER_AUTH_URL || process.env.BASE_URL,
	trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [],
});
