import { drizzle } from "drizzle-orm/postgres-js";
// Fix default import issue for 'postgres' (uses export =)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require("postgres");
import * as authSchema from "./auth-schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is not defined");
}

// railway internal connections typically don't need ssl;
// the public proxy usually does.
const isRailwayInternal = connectionString.includes(".railway.internal");
const wantsSslMode =
	connectionString.includes("sslmode=require") || connectionString.includes("sslmode=prefer");

const ssl = wantsSslMode ? "require" : isRailwayInternal ? false : "require";

// Create PostgreSQL connection with improved settings for Railway/production
const queryClient = postgres(connectionString, {
	max: 10,
	idle_timeout: 20,
	connect_timeout: 30,
	onnotice: () => {},
	ssl,
	keep_alive: 60,
	transform: {
		undefined: null,
	},
});

// log the real db error on startup (otherwise you only see better-auth's wrapper)
void (async () => {
	try {
		await queryClient`select 1 as ok`;
		console.log("db connected");
	} catch (err) {
		console.error("db connection failed", err);
	}
})();

// Create Drizzle instance with auth schema
export const db = drizzle(queryClient, {
	schema: authSchema,
});

export { queryClient };
