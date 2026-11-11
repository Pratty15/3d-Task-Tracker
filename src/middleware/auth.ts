import type { MiddlewareHandler } from 'hono'
import PocketBase from 'pocketbase'

export interface AppEnv {
  Variables: {
    pb: PocketBase
  }
}

/**
 * Middleware to instantiate a request-scoped PocketBase client
 * using the incoming cookies, and export any auth updates.
 */
export const pocketbaseMiddleware = (): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const pb = new PocketBase('http://127.0.0.1:8090')

    // Parse and load auth info from request cookies
    const cookieHeader = c.req.header('Cookie') || ''
    pb.authStore.loadFromCookie(cookieHeader)

    // Store in context for route handlers
    c.set('pb', pb)

    await next()

    // Export any changes (e.g. login, signup auto-login, logout clear) back as cookie
    // The standard pb.authStore.exportToCookie creates a Set-Cookie string.
    // However, if the store is cleared (logout), we clear the cookie manually.
    if (!pb.authStore.isValid) {
      c.header('Set-Cookie', 'pb_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax')
    } else {
      const cookie = pb.authStore.exportToCookie({
        httpOnly: true,
        secure: false, // change to true in prod/HTTPS
        sameSite: 'Lax',
        path: '/'
      })
      if (cookie) {
        c.header('Set-Cookie', cookie)
      }
    }
  }
}

/**
 * Middleware to enforce authentication on protected endpoints.
 */
export const requireAuth = (): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const pb = c.get('pb')
    if (!pb || !pb.authStore.isValid) {
      return c.redirect('/login')
    }
    await next()
  }
}
