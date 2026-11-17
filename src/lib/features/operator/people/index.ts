/**
 * Barrel - public surface of this feature module.
 */
export { default as PeopleList } from './components/PeopleList.svelte';
export { default as PersonDetail } from './components/PersonDetail.svelte';
export { personDetailQuery } from './queries';
export {
	personDtoSchema,
	listPersonMembershipsResponseSchema,
	globalSuspendRequestSchema,
	anonymisePersonRequestSchema
} from './schemas.ts';
export {
	personDisplayName,
	personLifecycleBadge,
	canGloballySuspend,
	canLiftSuspension,
	canAnonymise
} from './view-models.ts';
export type { PersonDto } from './types.ts';
