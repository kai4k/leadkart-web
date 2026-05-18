import { createQuery } from '@tanstack/svelte-query';
import * as api from './api';

export const dashboardKeys = {
	all: ['operator', 'dashboard'] as const,
	stats: () => [...dashboardKeys.all, 'stats'] as const
};

/**
 * Platform stats query — refetches every 60 s so the dashboard stays
 * live without a manual refresh.
 */
export function platformStatsQuery() {
	return createQuery(() => ({
		queryKey: dashboardKeys.stats(),
		queryFn: () => api.getPlatformStats(),
		refetchInterval: 60_000
	}));
}
