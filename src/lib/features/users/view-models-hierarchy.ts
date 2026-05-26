/**
 * Hierarchy view-model — builds a tree of OrgNode out of the flat
 * UserDto[] using `reports_to` pointers.
 *
 * Algorithm: index by membership_id, then for each user push it into
 * its parent's `children` array (root = users with no manager). Pure;
 * no I/O. Order roots and children by display name for a stable
 * deterministic render.
 *
 * Cycle guard: if a cycle is detected (A→B→A), the cycle's tail user
 * is promoted to root and flagged `cycleBroken: true` so the UI can
 * surface a one-time warning. Cycles SHOULD be impossible (the backend
 * rejects them on AssignManager) but the UI must never hang.
 */
import type { UserDto } from './types';
import { displayName } from '$features/auth/view-models';

export interface OrgNode {
	user: UserDto;
	depth: number;
	cycleBroken: boolean;
	children: OrgNode[];
}

export interface OrgTree {
	roots: OrgNode[];
	orphans: OrgNode[];
	totalMembers: number;
}

export function buildOrgTree(users: ReadonlyArray<UserDto>): OrgTree {
	const byId = new Map<string, UserDto>();
	for (const u of users) byId.set(u.membership_id, u);

	const visited = new Set<string>();
	const nodes = new Map<string, OrgNode>();

	function build(u: UserDto, depth: number, ancestors: Set<string>): OrgNode {
		const existing = nodes.get(u.membership_id);
		if (existing) return existing;

		const node: OrgNode = {
			user: u,
			depth,
			cycleBroken: false,
			children: []
		};
		nodes.set(u.membership_id, node);
		visited.add(u.membership_id);

		const childUsers = users
			.filter((c) => c.reports_to === u.membership_id)
			.sort((a, b) => displayName(a).localeCompare(displayName(b)));

		const nextAncestors = new Set(ancestors);
		nextAncestors.add(u.membership_id);

		for (const c of childUsers) {
			if (nextAncestors.has(c.membership_id)) {
				const cycleNode: OrgNode = {
					user: c,
					depth: depth + 1,
					cycleBroken: true,
					children: []
				};
				node.children.push(cycleNode);
				continue;
			}
			node.children.push(build(c, depth + 1, nextAncestors));
		}
		return node;
	}

	const rootUsers = users
		.filter((u) => !u.reports_to || !byId.has(u.reports_to))
		.sort((a, b) => displayName(a).localeCompare(displayName(b)));

	const roots = rootUsers.map((u) => build(u, 0, new Set()));

	const orphans: OrgNode[] = [];
	for (const u of users) {
		if (!visited.has(u.membership_id)) {
			orphans.push(build(u, 0, new Set()));
		}
	}

	return {
		roots,
		orphans,
		totalMembers: users.length
	};
}
