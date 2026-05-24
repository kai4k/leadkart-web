/**
 * Operator scope feature barrel — see api.ts for the gateway and
 * the BFF cookie-auth ADR for the surrounding flow.
 */
export { enterScope, exitScope, type EnterScopeRequest, type EnterScopeResponse } from './api';
