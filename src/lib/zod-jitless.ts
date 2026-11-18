/**
 * Disable zod's `new Function` JIT parser. Zod probes `new Function('')` when
 * an object schema is built; under a strict CSP (no 'unsafe-eval') the throw is
 * caught but browsers still report it as a `securitypolicyviolation`.
 *
 * Imported FIRST by `hooks.client.ts` so it runs before any route module
 * constructs a schema. Server-side parsing keeps the JIT (no CSP on Node).
 */
import { z } from 'zod';

z.config({ jitless: true });
