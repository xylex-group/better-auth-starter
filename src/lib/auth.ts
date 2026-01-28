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
import { passkey } from "@better-auth/passkey";
import { expo } from "@better-auth/expo";
import { Resend } from "resend";
import { Redis } from "ioredis";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { member as memberTable } from "../auth-schema";

const redis = new Redis(`${process.env.REDIS_URL}?family=0`)
   .on("error", (err) => console.error("Redis connection error:", err))
   .on("connect", () => console.log("Redis connected"))
   .on("ready", () => console.log("Redis ready"));

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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
	},
	account: {
		accountLinking: {
			enabled: true,
		},
	},
	socialProviders: {
		apple: {
			clientId: process.env.APPLE_CLIENT_ID!,
			clientSecret: process.env.APPLE_CLIENT_SECRET!,
		},
	},
	plugins: [
		expo(),
		openAPI(),
		multiSession(),
		bearer(),
		organization({
			organizationHooks: {
				afterAcceptInvitation: async ({ invitation, member }: any) => {
					if (invitation?.customerId && member) {
						await db.update(memberTable)
							.set({ customerId: invitation.customerId })
							.where(eq(memberTable.id, member.id));
					}
				},
			},
		}),
		apiKey(),
		emailOTP({
			otpLength: 6,
			expiresIn: 300,
			async sendVerificationOTP({ email, otp, type }) {
				const subjects: Record<string, string> = {
					"sign-in": "Your Sign-In Code",
					"email-verification": "Verify Your Email",
					"forget-password": "Reset Your Password",
				};

				const messages: Record<string, string> = {
					"sign-in": "Use this code to sign in to your account:",
					"email-verification": "Use this code to verify your email address:",
					"forget-password": "Use this code to reset your password:",
				};

				if (!resend) {
					console.log(`OTP for ${email}: ${otp}`);
					return;
				}
				await resend.emails.send({
					from: process.env.BETTER_AUTH_EMAIL || "noreply@suitsbooks.com",
					to: email,
					subject: subjects[type],
					html: `
						<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
							<h1 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin-bottom: 24px;">
								${subjects[type]}
							</h1>
							<p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
								${messages[type]}
							</p>
							<div style="background-color: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
								<span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">
									${otp}
								</span>
							</div>
							<p style="color: #6a6a6a; font-size: 14px; line-height: 1.5;">
								This code will expire in 5 minutes. If you didn't request this code, you can safely ignore this email.
							</p>
						</div>
					`,
				});
			},
		}),
		username({}),
		twoFactor({ issuer: "SuitsBooks" }),
		admin(),
		passkey(),
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
		delete: async (key) => {
			await redis.del(key);
		},
	},
	baseURL,
	trustedOrigins: [
		...(process.env.TRUSTED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) || []),
		"https://suitsbooks.app",
		"https://app.suitsbooks.com",
		"suitsbooks://",
		"suitsbooks://*",
		"https://appleid.apple.com",
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
