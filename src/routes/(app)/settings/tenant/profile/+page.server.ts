import { saveTenantSection } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = { default: saveTenantSection('profile') };
