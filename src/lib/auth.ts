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
	// User configuration to match main app schema
	user: {
		// Explicit field mappings - database uses snake_case
		fields: {
			name: "name",
			email: "email",
			emailVerified: "email_verified",  // Database uses snake_case
			image: "image",
			createdAt: "created_at",  // Database uses snake_case
			updatedAt: "updated_at",  // Database uses snake_case
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
	// Session config
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // Update session every 24 hours
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
		// Explicit field mappings - database uses snake_case
		fields: {
			id: "id",
			userId: "user_id",  // Database uses snake_case
			token: "token",
			expiresAt: "expires_at",  // Database uses snake_case
			ipAddress: "ip_address",  // Database uses snake_case
			userAgent: "user_agent",  // Database uses snake_case
			createdAt: "created_at",  // Database uses snake_case
			updatedAt: "updated_at",  // Database uses snake_case
		},
	},
	// Account field mappings - database uses snake_case
	account: {
		fields: {
			id: "id",
			userId: "user_id",  // Database uses snake_case
			accountId: "account_id",  // Database uses snake_case
			providerId: "provider_id",  // Database uses snake_case
			accessToken: "access_token",  // Database uses snake_case
			refreshToken: "refresh_token",  // Database uses snake_case
			accessTokenExpiresAt: "access_token_expires_at",  // Database uses snake_case
			refreshTokenExpiresAt: "refresh_token_expires_at",  // Database uses snake_case
			scope: "scope",
			idToken: "id_token",  // Database uses snake_case
			password: "password",
			createdAt: "created_at",  // Database uses snake_case
			updatedAt: "updated_at",  // Database uses snake_case
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
	baseURL,
	trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [],
});
