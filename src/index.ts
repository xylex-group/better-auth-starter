import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
import { logger } from 'hono/logger'

const app = new Hono()

app.use(logger())

// CORS middleware - must be before routes
const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',').map(s => s.trim()) || []

app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return true
    
    // Check if origin is in trusted origins
    if (trustedOrigins.includes(origin)) {
      return origin
    }
    
    // For development, allow localhost
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return origin
    }
    
    return false
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposeHeaders: ['Content-Type'],
  credentials: true,
  maxAge: 86400,
}))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

/**
 * Better Auth routes, see docs before changing
 * @link https://better-auth.com/docs
 * Include OPTIONS to handle CORS preflight requests
 */
app.on(["POST", "GET", "OPTIONS", "PUT", "DELETE", "PATCH"], "/api/auth/**", async (c) => {
  // Handle OPTIONS preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }
  
  try {
    const response = await auth.handler(c.req.raw);
    
    // Log 422 errors for debugging
    if (response.status === 422) {
      const clonedResponse = response.clone();
      const body = await clonedResponse.text();
      console.error('[422 Error]', {
        path: c.req.path,
        method: c.req.method,
        body: body,
        headers: Object.fromEntries(c.req.raw.headers.entries()),
      });
    }
    
    return response;
  } catch (error) {
    console.error('[Auth Handler Error]', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app