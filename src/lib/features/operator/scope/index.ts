/**
 * Operator scope feature barrel — see api.ts for the gateway, service.ts for the enter / exit
 * flows and the BFF cookie-auth ADR for the surrounding picture.
 */
export type { EnterScopeRequest, EnterScopeResponse } from './api';
export { enterScopeMutation, exitScopeMutation } from './queries';
