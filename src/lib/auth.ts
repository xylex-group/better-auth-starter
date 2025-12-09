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
		// Explicit field mappings - database uses camelCase
		fields: {
			name: "name",
			email: "email",
			emailVerified: "emailVerified",  // Database uses camelCase
			image: "image",
			createdAt: "createdAt",  // Database uses camelCase
			updatedAt: "updatedAt",  // Database uses camelCase
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
		// Explicit field mappings - check your database schema
		fields: {
			id: "id",
			userId: "userId",  // Check if this is camelCase or user_id
			token: "token",
			expiresAt: "expiresAt",  // Check if this is camelCase or expires_at
			ipAddress: "ipAddress",  // Check if this is camelCase or ip_address
			userAgent: "userAgent",  // Check if this is camelCase or user_agent
			createdAt: "createdAt",  // Check if this is camelCase or created_at
			updatedAt: "updatedAt",  // Check if this is camelCase or updated_at
		},
	},
	// Account field mappings - check your database schema
	account: {
		fields: {
			id: "id",
			userId: "userId",  // Check if this is camelCase or user_id
			accountId: "accountId",  // Check if this is camelCase or account_id
			providerId: "providerId",  // Check if this is camelCase or provider_id
			accessToken: "accessToken",  // Check if this is camelCase or access_token
			refreshToken: "refreshToken",  // Check if this is camelCase or refresh_token
			accessTokenExpiresAt: "accessTokenExpiresAt",  // Check if this is camelCase
			refreshTokenExpiresAt: "refreshTokenExpiresAt",  // Check if this is camelCase
			scope: "scope",
			idToken: "idToken",  // Check if this is camelCase or id_token
			password: "password",
			createdAt: "createdAt",  // Check if this is camelCase or created_at
			updatedAt: "updatedAt",  // Check if this is camelCase or updated_at
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
