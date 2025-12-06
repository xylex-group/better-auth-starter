import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { Pool } from "pg";
import { Redis } from "ioredis"

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
	},
	// Add your plugins here
	plugins: [openAPI()],
	// Advanced configuration
	advanced: {
		database: {
			generateId: () => crypto.randomUUID(),
		},
	},
	// DB config
	database: new Pool({
		connectionString: process.env.DATABASE_URL,
		log: (msg) => {
			// Enhanced logging for debugging
			if (msg.includes('error') || msg.includes('ERROR')) {
				console.error('[DB Error]', msg);
			} else {
				console.log('[DB]', msg);
			}
		},
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
