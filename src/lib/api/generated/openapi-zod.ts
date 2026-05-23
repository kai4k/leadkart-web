/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Zod schemas mirroring leadkart-go/api/openapi.yaml.
 * Source-of-record per backend ADR 0050. Regenerate with `npm run openapi:codegen`.
 * The @zodios/core scaffolding has been stripped by scripts/strip-zodios.mjs —
 * we use TanStack Query, not Zodios.
 */
import { z } from 'zod';

export const LoginRequest = z
	.object({ email: z.string().email(), password: z.string(), device_label: z.string().optional() })
	.passthrough();
export const LoginResponse = z
	.object({
		access_token: z.string(),
		refresh_token: z.string(),
		access_token_expires_at: z.string().datetime({ offset: true }),
		token_type: z.literal('Bearer'),
		must_change_password: z.boolean().optional()
	})
	.passthrough();
export const ErrorResponse = z
	.object({
		type: z.string().optional(),
		title: z.string().optional(),
		status: z.number().int().optional(),
		detail: z.string().optional(),
		error: z.string(),
		message: z.string().optional(),
		errors: z.record(z.string(), z.array(z.string())).optional()
	})
	.passthrough();
export const RefreshRequest = z.object({ refresh_token: z.string() }).passthrough();
export const LogoutRequest = z
	.object({ refresh_token: z.string(), reason: z.string().optional() })
	.passthrough();
export const RequestPasswordResetRequest = z.object({ email: z.string().email() }).passthrough();
export const ResetPasswordRequest = z
	.object({ token: z.string(), new_password: z.string().min(12) })
	.passthrough();
export const ChangePasswordRequest = z
	.object({ current_password: z.string(), new_password: z.string().min(12) })
	.passthrough();
export const RequestEmailChangeRequest = z.object({ new_email: z.string().email() }).passthrough();
export const ConfirmEmailChangeRequest = z.object({ token: z.string() }).passthrough();
export const CapabilityRoleDto = z
	.object({ id: z.string().uuid(), name: z.string(), is_super_admin: z.boolean() })
	.passthrough();
export const CapabilitiesDto = z
	.object({
		person_id: z.string().uuid(),
		membership_id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		tenant_slug: z.string(),
		email: z.string().email().optional(),
		first_name: z.string().optional(),
		last_name: z.string().optional(),
		is_platform: z.boolean(),
		is_super_user: z.boolean(),
		permissions: z.array(z.string()),
		roles: z.array(CapabilityRoleDto)
	})
	.passthrough();
export const AuditEventDto = z
	.object({
		id: z.string().uuid(),
		action: z.string(),
		actor_id: z.string().uuid().optional(),
		tenant_id: z.string().uuid().optional(),
		correlation_id: z.string().uuid().optional(),
		occurred_at: z.string().datetime({ offset: true }),
		duration_ms: z.number().int(),
		succeeded: z.boolean(),
		failure_reason: z.string().optional(),
		payload: z.object({}).partial().passthrough().optional()
	})
	.passthrough();
export const ListAuditEventsResponse = z
	.object({
		events: z.array(AuditEventDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const SessionDto = z
	.object({
		family_id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		device_label: z.string(),
		created_at: z.string().datetime({ offset: true }),
		last_used_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListSessionsResponse = z.object({ sessions: z.array(SessionDto) }).passthrough();
export const RevokeAllSessionsRequest = z
	.object({ except_current: z.boolean(), reason: z.string() })
	.partial()
	.passthrough();
export const RevokeAllSessionsResponse = z
	.object({ revoked_count: z.number().int() })
	.passthrough();
export const AdminAddressDto = z
	.object({
		street: z.string(),
		city: z.string(),
		district: z.string(),
		state: z.string(),
		state_code: z.string(),
		pincode: z.string()
	})
	.partial()
	.passthrough();
export const PasswordPolicyDto = z
	.object({
		min_length: z.number().int(),
		require_uppercase: z.boolean(),
		require_lowercase: z.boolean(),
		require_digit: z.boolean(),
		require_symbol: z.boolean(),
		max_failed_attempts: z.number().int(),
		lockout_minutes: z.number().int()
	})
	.passthrough();
export const TenantDto = z
	.object({
		id: z.string().uuid(),
		slug: z.string(),
		legal_name: z.string(),
		display_name: z.string(),
		status: z.enum(['pending', 'active', 'suspended', 'marked_for_deletion', 'hard_deleted']),
		created_at: z.string().datetime({ offset: true }),
		activated_at: z.string().datetime({ offset: true }).optional(),
		suspended_at: z.string().datetime({ offset: true }).optional(),
		deletion_scheduled_at: z.string().datetime({ offset: true }).optional(),
		deletion_reason: z.string().optional(),
		gst_number: z.string().optional(),
		pan_number: z.string().optional(),
		drug_licence_number: z.string().optional(),
		admin_phone: z.string().optional(),
		admin_address: AdminAddressDto,
		password_policy: PasswordPolicyDto,
		locale: z.string().optional(),
		time_zone: z.string().optional(),
		date_format: z.string().optional(),
		currency: z.string().optional()
	})
	.passthrough();
export const ListTenantsResponse = z.object({ tenants: z.array(TenantDto) }).passthrough();
export const RegisterTenantRequest = z
	.object({
		slug: z
			.string()
			.min(2)
			.max(100)
			.regex(/^[a-z0-9-]+$/),
		legal_name: z.string().max(200),
		display_name: z.string().max(200),
		admin_email: z.string().email(),
		admin_password: z.string().min(12),
		admin_first_name: z.string(),
		admin_last_name: z.string()
	})
	.passthrough();
export const RegisterTenantResponse = z
	.object({
		tenant_id: z.string().uuid(),
		person_id: z.string().uuid(),
		membership_id: z.string().uuid()
	})
	.passthrough();
export const UpdateTenantProfileRequest = z
	.object({ legal_name: z.string().max(200), display_name: z.string().max(200) })
	.partial()
	.passthrough();
export const UpdateTenantStatutoryRequest = z
	.object({ gst_number: z.string(), pan_number: z.string(), drug_licence_number: z.string() })
	.partial()
	.passthrough();
export const UpdateTenantAdminContactRequest = z
	.object({ phone: z.string(), address: AdminAddressDto })
	.partial()
	.passthrough();
export const UpdateTenantSettingsRequest = z
	.object({ password_policy: PasswordPolicyDto })
	.passthrough();
export const UpdateTenantDisplayPreferencesRequest = z
	.object({
		locale: z.string(),
		time_zone: z.string(),
		date_format: z.string(),
		currency: z.string()
	})
	.partial()
	.passthrough();
export const SuspendTenantRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const MarkTenantForDeletionRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const UserDto = z
	.object({
		membership_id: z.string().uuid(),
		person_id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		email: z.string().email(),
		first_name: z.string(),
		last_name: z.string(),
		status: z.enum(['active', 'inactive']),
		designation: z.string().optional(),
		department: z.string().optional(),
		status_message: z.string().optional(),
		joined_at: z.string().datetime({ offset: true }).optional(),
		left_at: z.string().datetime({ offset: true }).optional(),
		reports_to: z.string().uuid().optional(),
		role_ids: z.array(z.string().uuid())
	})
	.passthrough();
export const ListUsersResponse = z
	.object({ users: z.array(UserDto), has_more: z.boolean(), next_cursor: z.string().optional() })
	.passthrough();
export const CreateUserRequest = z
	.object({
		email: z.string().email(),
		password: z.string().min(12),
		first_name: z.string(),
		last_name: z.string()
	})
	.passthrough();
export const CreateUserResponse = z
	.object({
		person_id: z.string().uuid(),
		membership_id: z.string().uuid(),
		person_existed: z.boolean()
	})
	.passthrough();
export const UpdateUserProfileRequest = z
	.object({ designation: z.string(), department: z.string(), status_message: z.string() })
	.partial()
	.passthrough();
export const DeactivateUserRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const AssignUserRoleRequest = z.object({ role_id: z.string().uuid() }).passthrough();
export const ReplaceUserPermissionOverridesRequest = z
	.object({ granted: z.array(z.string()), revoked: z.array(z.string()) })
	.partial()
	.passthrough();
export const AssignUserManagerRequest = z.object({ manager_id: z.string().uuid() }).passthrough();
export const RoleDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		name: z.string(),
		is_system_default: z.boolean(),
		is_super_admin: z.boolean(),
		hierarchy_level: z.number().int(),
		permissions: z.array(z.string()),
		created_at: z.string().datetime({ offset: true }),
		parent_role_id: z.string().uuid().optional()
	})
	.passthrough();
export const ListRolesResponse = z.object({ roles: z.array(RoleDto) }).passthrough();
export const CreateRoleRequest = z
	.object({
		name: z.string().min(2).max(100),
		hierarchy_level: z.number().int().gte(0).lte(99),
		parent_role_id: z.string().uuid().optional()
	})
	.passthrough();
export const CreateRoleResponse = z.object({ role_id: z.string().uuid() }).passthrough();
export const UpdateRoleRequest = z
	.object({
		name: z.string().min(2).max(100),
		hierarchy_level: z.number().int().gte(0).lte(99).nullable()
	})
	.partial()
	.passthrough();
export const SetRoleParentRequest = z
	.object({ parent_role_id: z.string().uuid().nullable() })
	.passthrough();
export const ReplaceRolePermissionsRequest = z
	.object({ permissions: z.array(z.string()) })
	.passthrough();
export const RolePermissionRequest = z.object({ permission: z.string() }).passthrough();
export const ListAllTenantsResponse = z.object({ tenants: z.array(TenantDto) }).passthrough();
export const PersonDto = z
	.object({
		id: z.string().uuid(),
		email: z.string().email(),
		first_name: z.string(),
		last_name: z.string(),
		is_active: z.boolean(),
		is_anonymised: z.boolean(),
		is_globally_suspended: z.boolean(),
		global_suspension_reason: z.string().optional(),
		globally_suspended_at: z.string().datetime({ offset: true }).optional(),
		created_at: z.string().datetime({ offset: true }),
		anonymised_at: z.string().datetime({ offset: true }).optional()
	})
	.passthrough();
export const ListPersonMembershipsResponse = z
	.object({ memberships: z.array(UserDto) })
	.passthrough();
export const UpdatePersonProfileRequest = z
	.object({ first_name: z.string(), last_name: z.string() })
	.partial()
	.passthrough();
export const GlobalSuspendPersonRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const PlatformStatsDeltas = z
	.object({
		window: z.enum(['24h', '7d', '30d']),
		tenants_total: z.number().int(),
		tenants_active: z.number().int(),
		persons_total: z.number().int(),
		memberships_active: z.number().int()
	})
	.passthrough();
export const PlatformStatsResponse = z
	.object({
		tenants_total: z.number().int(),
		tenants_active: z.number().int(),
		tenants_suspended: z.number().int(),
		persons_total: z.number().int(),
		memberships_active: z.number().int(),
		deltas: PlatformStatsDeltas.optional()
	})
	.passthrough();
export const CreateImpersonationSessionRequest = z
	.object({
		target_tenant_id: z.string().uuid(),
		reason: z.string().min(10),
		duration_minutes: z.number().int().gte(1).lte(240).optional().default(30)
	})
	.passthrough();
export const CreateImpersonationSessionResponse = z
	.object({
		session_id: z.string().uuid(),
		expires_at_utc: z.string().datetime({ offset: true }),
		access_token: z.string(),
		access_token_expires_at_utc: z.string().datetime({ offset: true }),
		token_type: z.literal('Bearer')
	})
	.passthrough();
export const ImpersonationSessionDto = z
	.object({
		session_id: z.string().uuid(),
		operator_id: z.string().uuid(),
		target_tenant_id: z.string().uuid(),
		reason: z.string(),
		created_at: z.string().datetime({ offset: true }),
		expires_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListImpersonationSessionsResponse = z
	.object({ sessions: z.array(ImpersonationSessionDto) })
	.passthrough();
export const SearchPersonHit = z
	.object({
		id: z.string().uuid(),
		email: z.string().email(),
		first_name: z.string(),
		last_name: z.string(),
		created_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const SearchTenantHit = z
	.object({
		id: z.string().uuid(),
		slug: z.string(),
		legal_name: z.string(),
		display_name: z.string(),
		status: z.string(),
		created_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const SearchResponse = z
	.object({
		persons: z.array(SearchPersonHit),
		tenants: z.array(SearchTenantHit),
		has_partial: z.boolean()
	})
	.passthrough();
export const CreatePermissionRequestRequest = z
	.object({
		permission: z.string(),
		duration_days: z.number().int().gte(1).lte(90).optional(),
		reason: z.string().min(10).max(1024)
	})
	.passthrough();
export const CreatePermissionRequestResponse = z
	.object({
		request_id: z.string().uuid(),
		approver_membership_id: z.string().uuid().optional(),
		status: z.literal('pending')
	})
	.passthrough();
export const PermissionRequestDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		requester_membership_id: z.string().uuid(),
		permission: z.string(),
		duration_days: z.number().int(),
		reason: z.string(),
		state: z.enum(['pending', 'approved', 'denied', 'cancelled']),
		approver_membership_id: z.string().uuid().optional(),
		decided_at: z.string().datetime({ offset: true }).optional(),
		decision_reason: z.string().optional(),
		expires_at: z.string().datetime({ offset: true }).optional(),
		created_at: z.string().datetime({ offset: true }),
		updated_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListPermissionRequestsResponse = z
	.object({
		requests: z.array(PermissionRequestDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const ApprovePermissionRequestRequest = z
	.object({ decision_reason: z.string().max(1024) })
	.partial()
	.passthrough();
export const DenyPermissionRequestRequest = z
	.object({ decision_reason: z.string().min(1).max(1024) })
	.passthrough();

export const schemas = {
	LoginRequest,
	LoginResponse,
	ErrorResponse,
	RefreshRequest,
	LogoutRequest,
	RequestPasswordResetRequest,
	ResetPasswordRequest,
	ChangePasswordRequest,
	RequestEmailChangeRequest,
	ConfirmEmailChangeRequest,
	CapabilityRoleDto,
	CapabilitiesDto,
	AuditEventDto,
	ListAuditEventsResponse,
	SessionDto,
	ListSessionsResponse,
	RevokeAllSessionsRequest,
	RevokeAllSessionsResponse,
	AdminAddressDto,
	PasswordPolicyDto,
	TenantDto,
	ListTenantsResponse,
	RegisterTenantRequest,
	RegisterTenantResponse,
	UpdateTenantProfileRequest,
	UpdateTenantStatutoryRequest,
	UpdateTenantAdminContactRequest,
	UpdateTenantSettingsRequest,
	UpdateTenantDisplayPreferencesRequest,
	SuspendTenantRequest,
	MarkTenantForDeletionRequest,
	UserDto,
	ListUsersResponse,
	CreateUserRequest,
	CreateUserResponse,
	UpdateUserProfileRequest,
	DeactivateUserRequest,
	AssignUserRoleRequest,
	ReplaceUserPermissionOverridesRequest,
	AssignUserManagerRequest,
	RoleDto,
	ListRolesResponse,
	CreateRoleRequest,
	CreateRoleResponse,
	UpdateRoleRequest,
	SetRoleParentRequest,
	ReplaceRolePermissionsRequest,
	RolePermissionRequest,
	ListAllTenantsResponse,
	PersonDto,
	ListPersonMembershipsResponse,
	UpdatePersonProfileRequest,
	GlobalSuspendPersonRequest,
	PlatformStatsDeltas,
	PlatformStatsResponse,
	CreateImpersonationSessionRequest,
	CreateImpersonationSessionResponse,
	ImpersonationSessionDto,
	ListImpersonationSessionsResponse,
	SearchPersonHit,
	SearchTenantHit,
	SearchResponse,
	CreatePermissionRequestRequest,
	CreatePermissionRequestResponse,
	PermissionRequestDto,
	ListPermissionRequestsResponse,
	ApprovePermissionRequestRequest,
	DenyPermissionRequestRequest
};
