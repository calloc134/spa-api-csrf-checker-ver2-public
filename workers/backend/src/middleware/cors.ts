import { cors } from 'hono/cors'

/**
 * CORS middleware: Access-Control-Allow-Origin: * (credentials無し)
 */
export const corsAny = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
})

/**
 * CORS middleware: 特定オリジン + credentials有効
 */
export const corsSpecific = (expectedOrigin: string) =>
  cors({
    origin: expectedOrigin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  })
