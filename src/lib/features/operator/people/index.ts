/**
 * Barrel - public surface of this feature module.
 */
export { default as PeopleList } from './components/PeopleList.svelte';
export { default as PersonDetail } from './components/PersonDetail.svelte';
export { personDetailQuery } from './queries';
export {
	personDtoSchema,
	listPersonMembershipsResponseSchema,
	globalSuspendRequestSchema
} from './schemas.ts';
export {
	personDisplayName,
	personLifecycleKey,
	personLifecycle,
	canGloballySuspend,
	canLiftSuspension
} from './view-models.ts';
export type { PersonDto } from './types.ts';
