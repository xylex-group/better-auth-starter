import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from './auth-schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Create PostgreSQL connection with improved settings for Railway/production
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30, // Increased timeout
  // Add connection retry logic
  onnotice: () => {}, // Suppress notices
  // Better handling for connection resets - use connection string SSL if present
  // Railway PostgreSQL uses SSL by default, so we should enable it
  ssl: process.env.DATABASE_URL.includes('sslmode=require') || 
       process.env.DATABASE_URL.includes('sslmode=prefer') ? 'require' : 
       process.env.NODE_ENV === 'production' ? 'require' : false,
  // Keep connections alive
  keep_alive: 60, // Keep connections alive for 60 seconds
  // Handle connection errors gracefully
  transform: {
    undefined: null,
  },
});

// Create Drizzle instance with auth schema
export const db = drizzle(queryClient, { 
  schema: authSchema 
});

export { queryClient };

