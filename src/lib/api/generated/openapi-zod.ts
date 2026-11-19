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
		effective_permissions: z.array(z.string()),
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
	.object({
		parent_role_id: z.string().uuid().nullable(),
		reason: z.string().min(10).max(1024).optional()
	})
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
export const CreateUnverifiedContactRequest = z
	.object({
		contact_name: z.string().min(2).max(200),
		mobile_e164: z.string().regex(/^\+91[0-9]{10}$/),
		email: z.string().optional(),
		pincode: z.string().regex(/^[0-9]{6}$/),
		city: z.string(),
		district: z.string(),
		state: z.string(),
		street: z.string().optional(),
		has_drug_licence: z.boolean(),
		has_gst: z.boolean(),
		gst_number: z.string().optional(),
		has_pan: z.boolean(),
		pan_number: z.string().optional(),
		business_type: z.enum(['PCD', 'ThirdParty']),
		medicine_system: z.enum(['Allopathic', 'Ayurvedic']),
		product_ranges: z.array(z.string()).optional(),
		dosage_forms: z.array(z.string()).optional(),
		order_value: z.enum(['Below5000', 'Upto25000', 'Upto50000', 'Above50000']),
		buy_timeline: z.enum(['WithinWeek', 'Within15Days', 'WithinMonth'])
	})
	.passthrough();
export const CreateUnverifiedContactResponse = z
	.object({ contact_id: z.string().uuid() })
	.passthrough();
export const UnverifiedContactDto = z
	.object({
		id: z.string().uuid(),
		state: z.enum(['new', 'in_call', 'verified', 'rejected', 'busy']),
		contact_name: z.string(),
		mobile_e164: z.string(),
		city: z.string().optional(),
		state_geo: z.string().optional(),
		created_at: z.string().datetime({ offset: true }),
		created_by_membership_id: z.string().uuid()
	})
	.passthrough();
export const ListUnverifiedContactsResponse = z
	.object({
		items: z.array(UnverifiedContactDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const LogVerificationCallRequest = z
	.object({
		outcome: z.enum(['verified', 'rejected', 'busy', 'no_answer', 'wrong_number']),
		notes: z.string().optional(),
		callback_window_start_at: z.string().datetime({ offset: true }).optional(),
		callback_window_end_at: z.string().datetime({ offset: true }).optional()
	})
	.passthrough();
export const LogVerificationCallResponse = z.object({ call_id: z.string().uuid() }).passthrough();
export const VerifyUnverifiedContactResponse = z
	.object({ platform_lead_id: z.string().uuid() })
	.passthrough();
export const RejectUnverifiedContactRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const MarketplaceLeadDto = z
	.object({
		id: z.string().uuid(),
		contact_name: z.string(),
		city: z.string(),
		district: z.string(),
		state: z.string(),
		pincode: z.string(),
		has_drug_licence: z.boolean(),
		has_gst: z.boolean(),
		gst_verified: z.boolean(),
		has_pan: z.boolean(),
		business_type: z.string(),
		medicine_system: z.string(),
		product_ranges: z.array(z.string()).optional(),
		dosage_forms: z.array(z.string()).optional(),
		order_value: z.string(),
		buy_timeline: z.string(),
		verified_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const BrowseMarketplaceResponse = z
	.object({
		items: z.array(MarketplaceLeadDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const PurchaseLeadRequest = z
	.object({ amount_paisa: z.number().int().gte(1) })
	.passthrough();
export const PurchaseLeadResponse = z
	.object({ purchase_id: z.string().uuid(), platform_lead_id: z.string().uuid() })
	.passthrough();
export const TopupLeadCreditsRequest = z
	.object({
		tenant_id: z.string().uuid(),
		delta: z.number().int().gte(1),
		reason: z.string().min(1)
	})
	.passthrough();
export const TopupLeadCreditsResponse = z
	.object({ tenant_id: z.string().uuid(), new_balance: z.number().int() })
	.passthrough();
export const LeadCreditBalanceResponse = z
	.object({ tenant_id: z.string().uuid(), balance: z.number().int() })
	.passthrough();
export const CreateProductRequest = z
	.object({
		sku: z.string().min(1).max(64),
		name: z.string().min(1).max(200),
		dosage_form: z.string().min(1).max(50),
		pack_size: z.string().min(1).max(100),
		hsn_code: z.string().min(4).max(10),
		gst_rate_bps: z.number().int().gte(0).lte(10000),
		manufacturer: z.string().max(200).optional()
	})
	.passthrough();
export const CreateProductResponse = z.object({ product_id: z.string().uuid() }).passthrough();
export const ProductDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		sku: z.string().min(1).max(64),
		name: z.string().min(1).max(200),
		dosage_form: z.string().min(1).max(50),
		pack_size: z.string().min(1).max(100),
		hsn_code: z.string().min(4).max(10),
		gst_rate_bps: z.number().int().gte(0).lte(10000),
		manufacturer: z.string().max(200).optional(),
		is_active: z.boolean(),
		created_at: z.string().datetime({ offset: true }),
		updated_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListProductsResponse = z
	.object({ items: z.array(ProductDto), has_more: z.boolean(), next_cursor: z.string().optional() })
	.passthrough();
export const UpdateProductRequest = z
	.object({
		name: z.string().min(1).max(200),
		gst_rate_bps: z.number().int().gte(0).lte(10000),
		is_active: z.boolean(),
		manufacturer: z.string().max(200)
	})
	.partial()
	.passthrough();
export const AddBatchRequest = z
	.object({
		batch_number: z.string().min(1).max(100),
		manufacture_date: z.string().datetime({ offset: true }),
		expiry_date: z.string().datetime({ offset: true }),
		manufacturer_name: z.string().min(1).max(200),
		manufacturing_licence_number: z.string().min(1).max(100),
		mrp_paise: z.number().int().gte(0),
		purchase_price_paise: z.number().int().gte(0)
	})
	.passthrough();
export const AddBatchResponse = z.object({ batch_id: z.string().uuid() }).passthrough();
export const BatchDto = z
	.object({
		id: z.string().uuid(),
		product_id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		batch_number: z.string().min(1).max(100),
		manufacture_date: z.string().datetime({ offset: true }),
		expiry_date: z.string().datetime({ offset: true }),
		manufacturer_name: z.string().min(1).max(200),
		manufacturing_licence_number: z.string().min(1).max(100),
		mrp_paise: z.number().int().gte(0),
		purchase_price_paise: z.number().int().gte(0),
		quantity_on_hand: z.number().int().gte(0),
		version: z.number().int(),
		created_at: z.string().datetime({ offset: true }),
		updated_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListBatchesResponse = z
	.object({ items: z.array(BatchDto), has_more: z.boolean(), next_cursor: z.string().optional() })
	.passthrough();
export const FefoBatchesResponse = z.object({ items: z.array(BatchDto) }).passthrough();
export const LogMovementRequest = z
	.object({
		type: z.enum(['inbound', 'outbound', 'adjustment', 'reservation', 'release']),
		quantity: z.number().int().gte(1),
		reason: z.string().min(1).max(500),
		source_reference: z.string().max(200).optional()
	})
	.passthrough();
export const LogMovementResponse = z
	.object({ movement_id: z.string().uuid(), quantity_on_hand_after: z.number().int().gte(0) })
	.passthrough();
export const MovementDto = z
	.object({
		id: z.string().uuid(),
		batch_id: z.string().uuid(),
		product_id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		type: z.enum(['inbound', 'outbound', 'adjustment', 'reservation', 'release']),
		quantity: z.number().int(),
		quantity_on_hand_after: z.number().int().gte(0),
		reason: z.string().min(1).max(500),
		actor_membership_id: z.string().uuid(),
		source_reference: z.string().max(200).optional(),
		occurred_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListMovementsResponse = z
	.object({
		items: z.array(MovementDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const CrmLeadDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		stage: z.enum(['new', 'contacted', 'interested', 'negotiation', 'converted', 'lost']),
		temperature: z.enum(['hot', 'warm', 'cold', 'dead']),
		contact_name: z.string(),
		phone_e164: z.string(),
		city: z.string().optional(),
		district: z.string().optional(),
		state: z.string().optional(),
		pincode: z.string().optional(),
		business_type: z.enum(['', 'PCD', 'ThirdParty']).optional(),
		medicine_system: z.enum(['', 'Allopathic', 'Ayurvedic']).optional(),
		order_value: z.enum(['', 'Below5000', 'Upto25000', 'Upto50000', 'Above50000']).optional(),
		buy_timeline: z.enum(['', 'WithinWeek', 'Within15Days', 'WithinMonth']).optional(),
		has_drug_licence: z.boolean(),
		has_gst: z.boolean(),
		gst_verified: z.boolean(),
		product_ranges: z.array(z.string()).optional(),
		dosage_forms: z.array(z.string()).optional(),
		extra_profile: z.object({}).partial().passthrough().optional(),
		assignee_membership_id: z.string().uuid().optional(),
		assigned_at: z.string().datetime({ offset: true }).optional(),
		source_purchase_id: z.string().uuid().optional(),
		source_platform_lead_id: z.string().uuid().optional(),
		converted_at: z.string().datetime({ offset: true }).optional(),
		converted_by_membership_id: z.string().uuid().optional(),
		lost_at: z.string().datetime({ offset: true }).optional(),
		lost_by_membership_id: z.string().uuid().optional(),
		lost_reason: z.string().optional(),
		created_at: z.string().datetime({ offset: true }),
		created_by_membership_id: z.string().uuid().optional()
	})
	.passthrough();
export const ListLeadsResponse = z
	.object({ items: z.array(CrmLeadDto), has_more: z.boolean(), next_cursor: z.string().optional() })
	.passthrough();
export const AssignLeadRequest = z
	.object({ assignee_membership_id: z.string().uuid(), reason: z.string().optional() })
	.passthrough();
export const AssignLeadResponse = z
	.object({
		assignment_id: z.string().uuid().optional(),
		assignee_membership_id: z.string().uuid()
	})
	.passthrough();
export const ChangeStageRequest = z
	.object({
		new_stage: z.enum(['new', 'contacted', 'interested', 'negotiation']),
		reason: z.string().optional()
	})
	.passthrough();
export const ChangeTemperatureRequest = z
	.object({ new_temperature: z.enum(['hot', 'warm', 'cold', 'dead']) })
	.passthrough();
export const LogCallRequest = z
	.object({
		outcome: z.enum([
			'connected',
			'no_answer',
			'busy',
			'wrong_number',
			'not_interested',
			'interested',
			'callback_requested',
			'converted',
			'other'
		]),
		notes: z.string().optional()
	})
	.passthrough();
export const LogCallResponse = z.object({ call_id: z.string().uuid() }).passthrough();
export const CreateWorkItemRequest = z
	.object({
		type: z.enum(['manual', 'callback_reminder', 'reorder_reminder', 'follow_up', 'custom']),
		priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
		title: z.string().min(1).max(200),
		description: z.string().optional(),
		assigned_to_membership_id: z.string().uuid(),
		batch_id: z.string().uuid().optional(),
		due_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const CreateWorkItemResponse = z.object({ work_item_id: z.string().uuid() }).passthrough();
export const WorkItemDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		type: z.enum(['manual', 'callback_reminder', 'reorder_reminder', 'follow_up', 'custom']),
		priority: z.enum(['low', 'medium', 'high', 'urgent']),
		state: z.enum(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']),
		title: z.string(),
		description: z.string().optional(),
		assigned_to_membership_id: z.string().uuid(),
		assigned_by_membership_id: z.string().uuid(),
		due_at: z.string().datetime({ offset: true }),
		completed_at: z.string().datetime({ offset: true }).optional(),
		cancelled_at: z.string().datetime({ offset: true }).optional(),
		cancellation_reason: z.string().optional(),
		batch_id: z.string().uuid().optional(),
		source_module: z.string().optional(),
		source_entity_type: z.string().optional(),
		source_entity_id: z.string().optional(),
		created_at: z.string().datetime({ offset: true }),
		created_by_membership_id: z.string().uuid()
	})
	.passthrough();
export const ListWorkItemsResponse = z
	.object({
		items: z.array(WorkItemDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const DashboardResponse = z
	.object({
		today: z.number().int().gte(0),
		upcoming: z.number().int().gte(0),
		overdue: z.number().int().gte(0),
		completed_today: z.number().int().gte(0),
		total_pending: z.number().int().gte(0)
	})
	.passthrough();
export const CancelWorkItemRequest = z
	.object({ reason: z.string().min(1).max(1000) })
	.passthrough();
export const ReassignWorkItemRequest = z
	.object({ new_assignee_membership_id: z.string().uuid(), reason: z.string().optional() })
	.passthrough();
export const CreateConsignmentNoteRequest = z
	.object({
		order_id: z.string().uuid(),
		carrier_name: z.string().min(1),
		box_count: z.number().int().gte(1),
		weight_grams: z.number().int().gte(1),
		expected_delivery_at: z.string().datetime({ offset: true }).optional()
	})
	.passthrough();
export const CreateConsignmentNoteResponse = z
	.object({ consignment_note_id: z.string().uuid(), already_existed: z.boolean() })
	.passthrough();
export const ConsignmentNoteDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		order_id: z.string().uuid(),
		status: z.enum(['pending', 'dispatched', 'in_transit', 'delivered', 'failed']),
		carrier_name: z.string(),
		docket_number: z.string().optional(),
		box_count: z.number().int().gte(1),
		weight_grams: z.number().int().gte(1),
		expected_delivery_at: z.string().datetime({ offset: true }).optional(),
		dispatched_at: z.string().datetime({ offset: true }).optional(),
		in_transit_at: z.string().datetime({ offset: true }).optional(),
		delivered_at: z.string().datetime({ offset: true }).optional(),
		failed_at: z.string().datetime({ offset: true }).optional(),
		failure_reason: z.string().optional(),
		created_at: z.string().datetime({ offset: true }),
		created_by_membership_id: z.string().uuid()
	})
	.passthrough();
export const MarkDispatchedRequest = z.object({ docket_number: z.string().min(1) }).passthrough();
export const MarkFailedRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const OrderLineItemDto = z
	.object({
		product_id: z.string().uuid(),
		sku: z.string(),
		description: z.string().optional(),
		quantity: z.number().int().gte(1),
		unit_mrp_paise: z.number().int().gte(0).optional(),
		unit_sale_paise: z.number().int().gte(1),
		gst_rate_bps: z.number().int().gte(0).lte(10000)
	})
	.passthrough();
export const CreateQuotationRequest = z
	.object({
		customer_lead_id: z.string().uuid(),
		items: z.array(OrderLineItemDto),
		note: z.string().optional()
	})
	.passthrough();
export const CreateQuotationResponse = z.object({ quotation_id: z.string().uuid() }).passthrough();
export const QuotationDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		customer_lead_id: z.string().uuid(),
		state: z.enum(['draft', 'approved', 'rejected']),
		revision_number: z.number().int(),
		items: z.array(OrderLineItemDto),
		rejection_reason: z.string().optional(),
		created_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ReviseQuotationRequest = z
	.object({ items: z.array(OrderLineItemDto), note: z.string().optional() })
	.passthrough();
export const ApproveQuotationResponse = z.object({ order_id: z.string().uuid() }).passthrough();
export const RejectQuotationRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const OrderDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		approved_quotation_id: z.string().uuid(),
		customer_lead_id: z.string().uuid(),
		state: z.enum([
			'quotation_draft',
			'quotation_approved',
			'token_paid',
			'confirmed',
			'packed',
			'invoiced',
			'dispatched',
			'delivered',
			'complete',
			'cancelled'
		]),
		items: z.array(OrderLineItemDto),
		subtotal_paise: z.number().int(),
		tax_paise: z.number().int(),
		grand_total_paise: z.number().int(),
		invoice_id: z.string().uuid().optional(),
		consignment_note_id: z.string().uuid().optional(),
		confirmed_at: z.string().datetime({ offset: true }).optional(),
		packed_at: z.string().datetime({ offset: true }).optional(),
		invoiced_at: z.string().datetime({ offset: true }).optional(),
		dispatched_at: z.string().datetime({ offset: true }).optional(),
		delivered_at: z.string().datetime({ offset: true }).optional(),
		completed_at: z.string().datetime({ offset: true }).optional(),
		cancelled_at: z.string().datetime({ offset: true }).optional(),
		cancellation_reason: z.string().optional(),
		created_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const RecordTokenPaymentRequest = z
	.object({
		method: z.enum(['upi', 'neft', 'rtgs', 'imps', 'cheque', 'cash', 'card_offline']),
		amount_paise: z.number().int().gte(1),
		external_reference: z.string().optional(),
		notes: z.string().optional()
	})
	.passthrough();
export const PackOrderRequest = z
	.object({
		carrier_name: z.string().min(1),
		box_count: z.number().int().gte(1),
		weight_grams: z.number().int().gte(1),
		expected_delivery_at: z.string().datetime({ offset: true }).optional()
	})
	.passthrough();
export const InvoiceDto = z
	.object({
		id: z.string().uuid(),
		order_id: z.string().uuid(),
		number_display: z.string(),
		items: z.array(OrderLineItemDto),
		subtotal_paise: z.number().int(),
		tax_paise: z.number().int(),
		grand_total_paise: z.number().int(),
		issued_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const InvoiceOrderResponse = z
	.object({ invoice_id: z.string().uuid(), number_display: z.string() })
	.passthrough();
export const CancelOrderRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const PaymentDto = z
	.object({
		id: z.string().uuid(),
		order_id: z.string().uuid(),
		kind: z.enum(['token', 'full', 'refund']),
		method: z.enum(['upi', 'neft', 'rtgs', 'imps', 'cheque', 'cash', 'card_offline']),
		amount_paise: z.number().int(),
		external_reference: z.string().optional(),
		received_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListPaymentsResponse = z.object({ payments: z.array(PaymentDto) }).passthrough();
export const RecordPaymentRequest = z
	.object({
		kind: z.enum(['token', 'full', 'refund']),
		method: z.enum(['upi', 'neft', 'rtgs', 'imps', 'cheque', 'cash', 'card_offline']),
		amount_paise: z.number().int().gte(1),
		external_reference: z.string().optional(),
		notes: z.string().optional(),
		received_at: z.string().datetime({ offset: true }).optional()
	})
	.passthrough();
export const RecordPaymentResponse = z.object({ payment_id: z.string().uuid() }).passthrough();
export const MintCreditNoteRequest = z
	.object({ reason: z.string().min(1), amount_paise: z.number().int().gte(1) })
	.passthrough();
export const MintCreditNoteResponse = z
	.object({ credit_note_id: z.string().uuid(), number_display: z.string() })
	.passthrough();
export const LoseLeadRequest = z.object({ reason: z.string() }).passthrough();
export const CreateReminderRequest = z
	.object({
		assigned_to_membership_id: z.string().uuid(),
		due_at: z.string().datetime({ offset: true }),
		notes: z.string().optional()
	})
	.passthrough();
export const CreateReminderResponse = z.object({ reminder_id: z.string().uuid() }).passthrough();
export const ReminderDto = z
	.object({
		id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		lead_id: z.string().uuid(),
		assigned_to_membership_id: z.string().uuid(),
		created_by_membership_id: z.string().uuid().optional(),
		source_call_log_id: z.string().uuid().optional(),
		type: z.enum(['callback', 'mature_lead', 'manual']),
		state: z.enum(['pending', 'sent', 'cancelled']),
		due_at: z.string().datetime({ offset: true }),
		notes: z.string().optional(),
		sent_at: z.string().datetime({ offset: true }).optional(),
		marked_sent_by_membership_id: z.string().uuid().optional(),
		cancelled_at: z.string().datetime({ offset: true }).optional(),
		cancelled_by_membership_id: z.string().uuid().optional(),
		cancel_reason: z.string().optional(),
		created_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListRemindersResponse = z
	.object({
		items: z.array(ReminderDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const CancelReminderRequest = z.object({ reason: z.string() }).passthrough();
export const NotificationDto = z
	.object({
		id: z.string().uuid(),
		category: z.enum([
			'lead_assigned',
			'lead_converted',
			'order_confirmed',
			'order_delivered',
			'work_item_assigned',
			'work_item_overdue',
			'stock_expiring',
			'stock_below_reorder',
			'reminder'
		]),
		title: z.string(),
		body: z.string().optional(),
		state: z.enum(['unread', 'read', 'dismissed']),
		source_module: z.string().optional(),
		source_entity_type: z.string().optional(),
		source_entity_id: z.string().optional(),
		deep_link: z.string().optional(),
		created_at: z.string().datetime({ offset: true }),
		read_at: z.string().datetime({ offset: true }).optional(),
		dismissed_at: z.string().datetime({ offset: true }).optional()
	})
	.passthrough();
export const ListNotificationsResponse = z
	.object({
		items: z.array(NotificationDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const UnreadCountResponse = z.object({ unread_count: z.number().int() }).passthrough();
export const MarkAllReadResponse = z.object({ marked_read: z.number().int() }).passthrough();

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
	DenyPermissionRequestRequest,
	CreateUnverifiedContactRequest,
	CreateUnverifiedContactResponse,
	UnverifiedContactDto,
	ListUnverifiedContactsResponse,
	LogVerificationCallRequest,
	LogVerificationCallResponse,
	VerifyUnverifiedContactResponse,
	RejectUnverifiedContactRequest,
	MarketplaceLeadDto,
	BrowseMarketplaceResponse,
	PurchaseLeadRequest,
	PurchaseLeadResponse,
	TopupLeadCreditsRequest,
	TopupLeadCreditsResponse,
	LeadCreditBalanceResponse,
	CreateProductRequest,
	CreateProductResponse,
	ProductDto,
	ListProductsResponse,
	UpdateProductRequest,
	AddBatchRequest,
	AddBatchResponse,
	BatchDto,
	ListBatchesResponse,
	FefoBatchesResponse,
	LogMovementRequest,
	LogMovementResponse,
	MovementDto,
	ListMovementsResponse,
	CrmLeadDto,
	ListLeadsResponse,
	AssignLeadRequest,
	AssignLeadResponse,
	ChangeStageRequest,
	ChangeTemperatureRequest,
	LogCallRequest,
	LogCallResponse,
	CreateWorkItemRequest,
	CreateWorkItemResponse,
	WorkItemDto,
	ListWorkItemsResponse,
	DashboardResponse,
	CancelWorkItemRequest,
	ReassignWorkItemRequest,
	CreateConsignmentNoteRequest,
	CreateConsignmentNoteResponse,
	ConsignmentNoteDto,
	MarkDispatchedRequest,
	MarkFailedRequest,
	OrderLineItemDto,
	CreateQuotationRequest,
	CreateQuotationResponse,
	QuotationDto,
	ReviseQuotationRequest,
	ApproveQuotationResponse,
	RejectQuotationRequest,
	OrderDto,
	RecordTokenPaymentRequest,
	PackOrderRequest,
	InvoiceDto,
	InvoiceOrderResponse,
	CancelOrderRequest,
	PaymentDto,
	ListPaymentsResponse,
	RecordPaymentRequest,
	RecordPaymentResponse,
	MintCreditNoteRequest,
	MintCreditNoteResponse,
	LoseLeadRequest,
	CreateReminderRequest,
	CreateReminderResponse,
	ReminderDto,
	ListRemindersResponse,
	CancelReminderRequest,
	NotificationDto,
	ListNotificationsResponse,
	UnreadCountResponse,
	MarkAllReadResponse
};

/** One operation in api/openapi.yaml. `path` uses `:param` segments; `response` is the main 2xx schema (z.void() for 204). */
export interface GeneratedEndpoint {
	readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete';
	readonly path: string;
	readonly response: z.ZodType;
	readonly [key: string]: unknown;
}

export const endpoints: readonly GeneratedEndpoint[] = [
	{
		method: 'post',
		path: '/api/v1/auth/change-password',
		alias: 'postApiv1authchangePassword',
		description: `Current password verified even when authenticated (security.md &quot;Password change&quot;).`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ChangePasswordRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 401,
				description: `Incorrect current password`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/auth/confirm-email-change',
		alias: 'postApiv1authconfirmEmailChange',
		description: `Anonymous endpoint (the confirmation token IS the proof). The
uniqueness check on the target email happens here; a 400 with
&#x60;email_change_token_invalid&#x60; covers both expired tokens AND
target-email collisions.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ token: z.string() }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/auth/login',
		alias: 'postApiv1authlogin',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: LoginRequest
			}
		],
		response: LoginResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 423,
				description: `Account locked after [person.MaxFailedLogins] consecutive
failed login attempts within [person.LockoutWindow] per
NIST 800-63B §5.2.2 + ADR 0053. Retry-After header carries
integer seconds until unlock (RFC 7231 §7.1.3 delta-seconds).
`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/auth/logout',
		alias: 'postApiv1authlogout',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: LogoutRequest
			}
		],
		response: z.void()
	},
	{
		method: 'get',
		path: '/api/v1/auth/me/activity',
		alias: 'getApiv1authmeactivity',
		requestFormat: 'json',
		parameters: [
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			}
		],
		response: ListAuditEventsResponse
	},
	{
		method: 'get',
		path: '/api/v1/auth/me/capabilities',
		alias: 'getApiv1authmecapabilities',
		description: `Auth0 &#x60;/userinfo&#x60; canon. Returns JWT-resident fields (no DB hit) plus
cached profile enrichment (email + name + role names). The frontend
uses this to drive nav / tier / button-visibility without decoding
the JWT.
`,
		requestFormat: 'json',
		response: CapabilitiesDto
	},
	{
		method: 'post',
		path: '/api/v1/auth/refresh',
		alias: 'postApiv1authrefresh',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ refresh_token: z.string() }).passthrough()
			}
		],
		response: LoginResponse,
		errors: [
			{
				status: 401,
				description: `Refresh rejected (consumed / expired / family revoked)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/auth/request-email-change',
		alias: 'postApiv1authrequestEmailChange',
		description: `Authenticated route — PersonID derived from JWT Subject; new email
in the body. Confirmation link is emailed to the NEW address.
Per Auth0 / Okta / Microsoft Entra ID canon: ALWAYS returns 204
regardless of whether the target email is already taken — defeats
account enumeration. The unique-index at apply time enforces the
actual constraint via POST /api/v1/auth/confirm-email-change.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ new_email: z.string().email() }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/auth/request-password-reset',
		alias: 'postApiv1authrequestPasswordReset',
		description: `ALWAYS returns 204 regardless of whether the email is registered (Auth0/Okta canon — defeats account enumeration).`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ email: z.string().email() }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: z.void()
	},
	{
		method: 'post',
		path: '/api/v1/auth/reset-password',
		alias: 'postApiv1authresetPassword',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ResetPasswordRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/auth/sessions',
		alias: 'getApiv1authsessions',
		requestFormat: 'json',
		response: ListSessionsResponse
	},
	{
		method: 'delete',
		path: '/api/v1/auth/sessions',
		alias: 'deleteApiv1authsessions',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RevokeAllSessionsRequest
			}
		],
		response: z.object({ revoked_count: z.number().int() }).passthrough()
	},
	{
		method: 'delete',
		path: '/api/v1/auth/sessions/:familyId',
		alias: 'deleteApiv1authsessionsFamilyId',
		requestFormat: 'json',
		parameters: [
			{
				name: 'familyId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.void()
	},
	{
		method: 'get',
		path: '/api/v1/crm/leads',
		alias: 'getApiv1crmleads',
		description: `Returns a cursor-paginated page of CRM leads in the caller&#x27;s tenant.

Filters (all optional): stage, temperature, assignee, city, pincode,
business_type, medicine_system, name (pg_trgm partial match),
product_range (repeatable — AND semantics on text[] GIN), dosage_form
(repeatable).

Callers WITHOUT &#x60;crm.leads.read_all&#x60; see only leads assigned to
themselves; callers WITH it see the full tenant set per ADR 0060.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'stage',
				type: 'Query',
				schema: z
					.enum(['new', 'contacted', 'interested', 'negotiation', 'converted', 'lost'])
					.optional()
			},
			{
				name: 'temperature',
				type: 'Query',
				schema: z.enum(['hot', 'warm', 'cold', 'dead']).optional()
			},
			{
				name: 'assignee',
				type: 'Query',
				schema: z.string().uuid().optional()
			},
			{
				name: 'city',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'pincode',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'business_type',
				type: 'Query',
				schema: z.enum(['PCD', 'ThirdParty']).optional()
			},
			{
				name: 'medicine_system',
				type: 'Query',
				schema: z.enum(['Allopathic', 'Ayurvedic']).optional()
			},
			{
				name: 'name',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'product_range',
				type: 'Query',
				schema: z.array(z.string()).optional()
			},
			{
				name: 'dosage_form',
				type: 'Query',
				schema: z.array(z.string()).optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListLeadsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/crm/leads/:leadId',
		alias: 'getApiv1crmleadsLeadId',
		requestFormat: 'json',
		parameters: [
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: CrmLeadDto,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/leads/:leadId/assign',
		alias: 'postApiv1crmleadsLeadIdassign',
		description: `Sets the lead&#x27;s current assignee. Atomic with an append to the
AssignmentHistory audit table. Emits &#x60;crm.lead_assigned.v1&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: AssignLeadRequest
			},
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: AssignLeadResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Lead is in a terminal stage (converted / lost)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/leads/:leadId/calls',
		alias: 'postApiv1crmleadsLeadIdcalls',
		description: `Creates a CallLog row + emits &#x60;crm.call_logged.v1&#x60;. Refused on
terminal leads (converted / lost).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: LogCallRequest
			},
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ call_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Lead is in a terminal stage`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/leads/:leadId/convert',
		alias: 'postApiv1crmleadsLeadIdconvert',
		description: `Sets the lead to &#x60;converted&#x60;. Emits &#x60;crm.lead_converted.v1&#x60; —
this is the future Orders module&#x27;s create-trigger per ADR 0060.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Lead is already in a terminal stage`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/leads/:leadId/lose',
		alias: 'postApiv1crmleadsLeadIdlose',
		description: `Sets the lead to &#x60;lost&#x60;. &#x60;reason&#x60; is REQUIRED (audit doctrine).
Emits &#x60;crm.lead_lost.v1&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string() }).passthrough()
			},
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Lead is already in a terminal stage`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Reason missing`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/leads/:leadId/reminders',
		alias: 'postApiv1crmleadsLeadIdreminders',
		description: `Creates a &#x60;manual&#x60; Reminder owned by the supplied assignee.
&#x60;callback&#x60; + &#x60;mature_lead&#x60; reminders are auto-created by the
CallLogged subscriber (BRD §4.5) + the mature-lead daily scan
(BRD §4.7) respectively; the HTTP surface only mints manual ones.
Emits &#x60;crm.reminder_created.v1&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateReminderRequest
			},
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ reminder_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Invalid due_at / assignee`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/leads/:leadId/stage',
		alias: 'postApiv1crmleadsLeadIdstage',
		description: `Non-terminal transitions only: New → Contacted → Interested →
Negotiation. Use &#x60;/convert&#x60; or &#x60;/lose&#x60; for terminal transitions.
Emits &#x60;crm.lead_stage_changed.v1&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ChangeStageRequest
			},
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Lead is in a terminal stage OR transition is not allowed`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/leads/:leadId/temperature',
		alias: 'postApiv1crmleadsLeadIdtemperature',
		description: `Independent of stage — Hot/Warm/Cold/Dead transition at any
non-terminal stage. Emits &#x60;crm.lead_temperature_changed.v1&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ChangeTemperatureRequest
			},
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Lead is in a terminal stage`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/crm/reminders',
		alias: 'getApiv1crmreminders',
		description: `Returns a cursor-paginated page of pending reminders in the
caller&#x27;s tenant, sorted by &#x60;due_at&#x60; ASC (overdue first,
upcoming after). Filters: &#x60;type&#x60;, &#x60;assignee&#x60;, &#x60;lead_id&#x60;.

Callers WITHOUT &#x60;crm.leads.read_all&#x60; see only their own
assignee bucket per ADR 0060.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'type',
				type: 'Query',
				schema: z.enum(['callback', 'mature_lead', 'manual']).optional()
			},
			{
				name: 'assignee',
				type: 'Query',
				schema: z.string().uuid().optional()
			},
			{
				name: 'lead_id',
				type: 'Query',
				schema: z.string().uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListRemindersResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Caller probed another assignee without crm.leads.read_all`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/reminders/:reminderId/cancel',
		alias: 'postApiv1crmremindersReminderIdcancel',
		description: `Flips state to &#x60;cancelled&#x60;. &#x60;reason&#x60; is REQUIRED (audit
doctrine). Refused on already-terminal reminders. Emits
&#x60;crm.reminder_cancelled.v1&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string() }).passthrough()
			},
			{
				name: 'reminderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Reminder is already in a terminal state`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Reason missing`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/crm/reminders/:reminderId/sent',
		alias: 'postApiv1crmremindersReminderIdsent',
		description: `Flips state to &#x60;sent&#x60;. Refused on already-terminal reminders.
Emits &#x60;crm.reminder_marked_sent.v1&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'reminderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Reminder is already in a terminal state`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/dispatch/consignment-notes',
		alias: 'postApiv1dispatchconsignmentNotes',
		description: `Creates a pending ConsignmentNote for an order. Normally the
OrderPacked subscriber mints the slot automatically; this route
covers operator-driven creation. Idempotent on (tenant, order):
a pre-existing note returns 200 with &#x60;already_existed: true&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateConsignmentNoteRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: CreateConsignmentNoteResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/dispatch/consignment-notes',
		alias: 'getApiv1dispatchconsignmentNotes',
		description: `Returns the single note for the given &#x60;order_id&#x60;, or 404.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'order_id',
				type: 'Query',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ConsignmentNoteDto,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/dispatch/consignment-notes/:consignmentNoteId',
		alias: 'getApiv1dispatchconsignmentNotesConsignmentNoteId',
		requestFormat: 'json',
		parameters: [
			{
				name: 'consignmentNoteId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ConsignmentNoteDto,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/dispatch/consignment-notes/:consignmentNoteId/delivered',
		alias: 'postApiv1dispatchconsignmentNotesConsignmentNoteIddelivered',
		requestFormat: 'json',
		parameters: [
			{
				name: 'consignmentNoteId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid status transition`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/dispatch/consignment-notes/:consignmentNoteId/dispatch',
		alias: 'postApiv1dispatchconsignmentNotesConsignmentNoteIddispatch',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ docket_number: z.string().min(1) }).passthrough()
			},
			{
				name: 'consignmentNoteId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid status transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/dispatch/consignment-notes/:consignmentNoteId/failed',
		alias: 'postApiv1dispatchconsignmentNotesConsignmentNoteIdfailed',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1) }).passthrough()
			},
			{
				name: 'consignmentNoteId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid status transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/dispatch/consignment-notes/:consignmentNoteId/in-transit',
		alias: 'postApiv1dispatchconsignmentNotesConsignmentNoteIdinTransit',
		requestFormat: 'json',
		parameters: [
			{
				name: 'consignmentNoteId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid status transition`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/inventory/batches/:batchId',
		alias: 'getApiv1inventorybatchesBatchId',
		description: `Requires &#x60;inventory.stock.read&#x60; OR &#x60;inventory.stock.manage&#x60;.
Cross-tenant access surfaces as 404 per ADR 0044.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'batchId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: BatchDto,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/inventory/batches/:batchId/movements',
		alias: 'postApiv1inventorybatchesBatchIdmovements',
		description: `Requires &#x60;inventory.stock.manage&#x60;. Persists the movement + bumps
the batch&#x27;s quantity_on_hand atomically (single tx). Idempotency
via &#x60;X-Command-Id&#x60; per ADR 0031.

Quantity is the POSITIVE magnitude — direction is implicit in
Type (Outbound subtracts). Adjustment writes the positive
magnitude in slice 1; future &#x60;direction&#x60; field for up/down.

Rejections (409): insufficient_stock (Outbound &gt; on-hand),
batch_expired (Inbound on expired batch), conflict (concurrent
modification after retry cap).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: LogMovementRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'batchId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: LogMovementResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Insufficient stock / batch expired / concurrency conflict`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/inventory/batches/:batchId/movements',
		alias: 'getApiv1inventorybatchesBatchIdmovements',
		description: `Requires &#x60;inventory.stock.read&#x60; OR &#x60;inventory.stock.manage&#x60;.
Append-only ledger ordered (occurred_at, id) DESC. Optional
&#x60;type&#x60; filter narrows to one movement type.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'batchId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'type',
				type: 'Query',
				schema: z.enum(['inbound', 'outbound', 'adjustment', 'reservation', 'release']).optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListMovementsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/inventory/products',
		alias: 'postApiv1inventoryproducts',
		description: `Requires &#x60;inventory.catalog.manage&#x60;. SKU is canonicalised
upper-case + trimmed before per-tenant uniqueness check. 409 on
SKU collision. 422 on field-validation failure.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateProductRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ product_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `SKU already exists in this tenant`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/inventory/products',
		alias: 'getApiv1inventoryproducts',
		description: `Requires &#x60;inventory.catalog.read&#x60; OR &#x60;inventory.catalog.manage&#x60;.
Returns the live (non-deleted) products for the caller&#x27;s tenant
ordered (created_at, id) DESC. Filters narrow the result set.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'active',
				type: 'Query',
				schema: z.enum(['true', 'false']).optional()
			},
			{
				name: 'dosage_form',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'manufacturer',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'search',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListProductsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/inventory/products/:productId',
		alias: 'getApiv1inventoryproductsProductId',
		description: `Requires &#x60;inventory.catalog.read&#x60;. Cross-tenant access surfaces
as 404 per ADR 0044 enumeration-safety.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'productId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ProductDto,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/inventory/products/:productId',
		alias: 'patchApiv1inventoryproductsProductId',
		description: `Requires &#x60;inventory.catalog.manage&#x60;. Supplied-key partial update —
only fields present in the JSON body are applied (omitted fields
retain their prior value). JSON &#x60;null&#x60; is NOT distinguishable from
omission on the wire, so clearing a field is not supported; this
deliberately differs from RFC 7396 merge-patch semantics. 422 on
invariant failure (out-of-range GST bps, oversized name, etc).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateProductRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'productId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Product is deleted`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/inventory/products/:productId',
		alias: 'deleteApiv1inventoryproductsProductId',
		description: `Requires &#x60;inventory.catalog.manage&#x60;. Idempotent — repeat calls
return 204. REJECTED with 409 &#x60;product_has_live_stock&#x60; if any
live batch with quantity_on_hand &gt; 0 exists.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'productId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Product has live batches with non-zero stock`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/inventory/products/:productId/batches',
		alias: 'postApiv1inventoryproductsProductIdbatches',
		description: `Requires &#x60;inventory.stock.manage&#x60;. The parent product MUST exist
in the caller&#x27;s tenant scope (cross-tenant or missing → 404).
batch_number is unique per product on live rows.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: AddBatchRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'productId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ batch_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `batch_number already exists for this product`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/inventory/products/:productId/batches',
		alias: 'getApiv1inventoryproductsProductIdbatches',
		description: `Requires &#x60;inventory.stock.read&#x60; OR &#x60;inventory.stock.manage&#x60;.
Returns live batches ordered by expiry_date DESC. Expired batches
excluded by default (pass &#x60;include_expired&#x3D;true&#x60; to include).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'productId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'include_expired',
				type: 'Query',
				schema: z.enum(['true', 'false']).optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListBatchesResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/inventory/products/:productId/fefo-batches',
		alias: 'getApiv1inventoryproductsProductIdfefoBatches',
		description: `Requires &#x60;inventory.stock.read&#x60; OR &#x60;inventory.stock.manage&#x60;.
Returns LIVE, in-stock, not-yet-expired batches for the
supplied product, ordered (expiry_date ASC, id ASC) per BRD §6.5
First-Expired-First-Out canon. No pagination — feeds the
dispatch picker which needs the full eligible set to compute
multi-batch allocations against a single order quantity.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'productId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: FefoBatchesResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/notifications',
		alias: 'getApiv1notifications',
		description: `Returns the authenticated membership&#x27;s own notifications, newest first.
Optional &#x60;?state&#x3D;&#x60; and &#x60;?category&#x3D;&#x60; filters. Recipient scoping is
enforced server-side — a caller only ever sees their own inbox.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'state',
				type: 'Query',
				schema: z.enum(['unread', 'read', 'dismissed']).optional()
			},
			{
				name: 'category',
				type: 'Query',
				schema: z
					.enum([
						'lead_assigned',
						'lead_converted',
						'order_confirmed',
						'order_delivered',
						'work_item_assigned',
						'work_item_overdue',
						'stock_expiring',
						'stock_below_reorder',
						'reminder'
					])
					.optional()
			}
		],
		response: ListNotificationsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/notifications/:notificationId/dismiss',
		alias: 'postApiv1notificationsNotificationIddismiss',
		requestFormat: 'json',
		parameters: [
			{
				name: 'notificationId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/notifications/:notificationId/read',
		alias: 'postApiv1notificationsNotificationIdread',
		requestFormat: 'json',
		parameters: [
			{
				name: 'notificationId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Cannot mark a dismissed notification read`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/notifications/read-all',
		alias: 'postApiv1notificationsreadAll',
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ marked_read: z.number().int() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/notifications/unread-count',
		alias: 'getApiv1notificationsunreadCount',
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ unread_count: z.number().int() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/orders/orders/:orderId',
		alias: 'getApiv1ordersordersOrderId',
		requestFormat: 'json',
		parameters: [
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: OrderDto,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/orders/:orderId/cancel',
		alias: 'postApiv1ordersordersOrderIdcancel',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1) }).passthrough()
			},
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Order already terminal`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/orders/:orderId/complete',
		alias: 'postApiv1ordersordersOrderIdcomplete',
		requestFormat: 'json',
		parameters: [
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid state transition`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/orders/:orderId/confirm',
		alias: 'postApiv1ordersordersOrderIdconfirm',
		requestFormat: 'json',
		parameters: [
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid state transition`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/orders/:orderId/credit-notes',
		alias: 'postApiv1ordersordersOrderIdcreditNotes',
		description: `Post-delivery return (BRD §A-014). Mints a credit_note (partial amount
allowed) against the order&#x27;s invoice with a gapless number. Requires
&#x60;orders.orders.manage&#x60;. 404 if the order has no invoice.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: MintCreditNoteRequest
			},
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: MintCreditNoteResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/orders/orders/:orderId/invoice',
		alias: 'getApiv1ordersordersOrderIdinvoice',
		requestFormat: 'json',
		parameters: [
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: InvoiceDto,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/orders/:orderId/invoice',
		alias: 'postApiv1ordersordersOrderIdinvoice',
		requestFormat: 'json',
		parameters: [
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: InvoiceOrderResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid transition or invoice already exists`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/orders/:orderId/pack',
		alias: 'postApiv1ordersordersOrderIdpack',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: PackOrderRequest
			},
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid state transition`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/orders/orders/:orderId/payments',
		alias: 'getApiv1ordersordersOrderIdpayments',
		requestFormat: 'json',
		parameters: [
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListPaymentsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/orders/:orderId/payments',
		alias: 'postApiv1ordersordersOrderIdpayments',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RecordPaymentRequest
			},
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ payment_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Duplicate external reference`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/orders/:orderId/token-payment',
		alias: 'postApiv1ordersordersOrderIdtokenPayment',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RecordTokenPaymentRequest
			},
			{
				name: 'orderId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Invalid transition or duplicate payment reference`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/quotations',
		alias: 'postApiv1ordersquotations',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateQuotationRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ quotation_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/orders/quotations/:quotationId',
		alias: 'getApiv1ordersquotationsQuotationId',
		requestFormat: 'json',
		parameters: [
			{
				name: 'quotationId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: QuotationDto,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/quotations/:quotationId/approve',
		alias: 'postApiv1ordersquotationsQuotationIdapprove',
		requestFormat: 'json',
		parameters: [
			{
				name: 'quotationId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ order_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Quotation already rejected`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/quotations/:quotationId/reject',
		alias: 'postApiv1ordersquotationsQuotationIdreject',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1) }).passthrough()
			},
			{
				name: 'quotationId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Quotation already approved`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/orders/quotations/:quotationId/revise',
		alias: 'postApiv1ordersquotationsQuotationIdrevise',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ReviseQuotationRequest
			},
			{
				name: 'quotationId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Quotation is terminal`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/permission-requests',
		alias: 'postApiv1permissionRequests',
		description: `Caller (the requester) asks for a time-bound elevated permission.
The named approver is the requester&#x27;s current manager
(&#x60;tenant_memberships.reports_to&#x60;). If the requester has no
manager, only Platform operators can approve.
At most one pending request per (membership, permission) tuple.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreatePermissionRequestRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: CreatePermissionRequestResponse,
		errors: [
			{
				status: 403,
				description: `The route does not support the &#x60;X-Tenant-Id&#x60; operator scope (it acts on the
caller&#x27;s own tenant only) and the header selected a different tenant
(&#x60;tenant_scope_not_supported&#x60;, ADR 0039).
`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Another pending request already exists for this (membership, permission) tuple`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/permission-requests',
		alias: 'getApiv1permissionRequests',
		description: `Default &#x60;role&#x3D;requester&#x60; returns the caller&#x27;s own history (all states).
&#x60;role&#x3D;approver&#x60; returns the Pending queue waiting on the caller&#x27;s
decision. Keyset-paginated per ADR 0038.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'role',
				type: 'Query',
				schema: z.enum(['requester', 'approver']).optional().default('requester')
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListPermissionRequestsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `The route does not support the &#x60;X-Tenant-Id&#x60; operator scope (it acts on the
caller&#x27;s own tenant only) and the header selected a different tenant
(&#x60;tenant_scope_not_supported&#x60;, ADR 0039).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/permission-requests/:requestId',
		alias: 'getApiv1permissionRequestsRequestId',
		description: `Returns the request if the caller is either the requester, the
named approver, OR a Platform operator. Cross-caller reads
collapse to 404 per ADR 0044 enumeration-safety canon.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'requestId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: PermissionRequestDto,
		errors: [
			{
				status: 403,
				description: `The route does not support the &#x60;X-Tenant-Id&#x60; operator scope (it acts on the
caller&#x27;s own tenant only) and the header selected a different tenant
(&#x60;tenant_scope_not_supported&#x60;, ADR 0039).
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/permission-requests/:requestId/approve',
		alias: 'postApiv1permissionRequestsRequestIdapprove',
		description: `Transitions Pending → Approved AND lands a time-bound grant on
the requester&#x27;s membership overlay (single transaction). Caller
MUST be either the requester&#x27;s manager OR carry &#x60;is_platform&#x3D;true&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z
					.object({ decision_reason: z.string().max(1024) })
					.partial()
					.passthrough()
					.optional()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'requestId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Caller is not the manager and not a Platform operator, OR &#x60;X-Tenant-Id&#x60; selected a foreign tenant (&#x60;tenant_scope_not_supported&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Request is not in pending state`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/permission-requests/:requestId/cancel',
		alias: 'postApiv1permissionRequestsRequestIdcancel',
		description: `Withdraws a pending request. Caller MUST be the original
requester; cross-caller cancel collapses to 404 per
ADR 0044 enumeration-safety canon.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'requestId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `The route does not support the &#x60;X-Tenant-Id&#x60; operator scope (it acts on the
caller&#x27;s own tenant only) and the header selected a different tenant
(&#x60;tenant_scope_not_supported&#x60;, ADR 0039).
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Request is not in pending state`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/permission-requests/:requestId/deny',
		alias: 'postApiv1permissionRequestsRequestIddeny',
		description: `Transitions Pending → Denied. &#x60;decision_reason&#x60; is REQUIRED on
Deny per ADR 0055 audit canon. Same caller-authorization as Approve.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ decision_reason: z.string().min(1).max(1024) }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'requestId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Caller is not the manager and not a Platform operator, OR &#x60;X-Tenant-Id&#x60; selected a foreign tenant (&#x60;tenant_scope_not_supported&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Request is not in pending state`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/impersonation/sessions',
		alias: 'postApiv1platformimpersonationsessions',
		description: `Returns a scoped JWT (&#x60;aud&#x3D;leadkart-impersonation&#x60;,
&#x60;is_platform&#x3D;false&#x60;, &#x60;is_super_user&#x3D;false&#x60;, &#x60;permissions&#x3D;[tenant.admin]&#x60;)
pinned to the target tenant. Frontend uses this token for the
session lifetime (≤4h). The original operator&#x27;s regular JWT is
unaffected.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateImpersonationSessionRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: CreateImpersonationSessionResponse,
		errors: [
			{
				status: 404,
				description: `Target tenant not found`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/impersonation/sessions',
		alias: 'getApiv1platformimpersonationsessions',
		requestFormat: 'json',
		response: ListImpersonationSessionsResponse
	},
	{
		method: 'delete',
		path: '/api/v1/platform/impersonation/sessions/:sessionId',
		alias: 'deleteApiv1platformimpersonationsessionsSessionId',
		description: `Ends the session before its natural TTL. The scoped token issued
by POST /api/v1/platform/impersonation/sessions is invalidated
on the next request (security_stamp comparison via the
impersonation-session resolver).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'sessionId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/lead-credits/balance',
		alias: 'getApiv1platformleadCreditsbalance',
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: LeadCreditBalanceResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/lead-credits/topup',
		alias: 'postApiv1platformleadCreditstopup',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: TopupLeadCreditsRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: TopupLeadCreditsResponse,
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/marketplace/leads',
		alias: 'getApiv1platformmarketplaceleads',
		description: `Cursor-paginated list of UNSOLD platform leads. All filters optional.
&#x60;product_ranges&#x60; + &#x60;dosage_forms&#x60; are CSV (&#x60;?product_ranges&#x3D;Cardiac,Diabetic&#x60;)
and match ANY-overlap via GIN.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'state',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'city',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'district',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'pincode',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'business_type',
				type: 'Query',
				schema: z.enum(['PCD', 'ThirdParty']).optional()
			},
			{
				name: 'medicine_system',
				type: 'Query',
				schema: z.enum(['Allopathic', 'Ayurvedic']).optional()
			},
			{
				name: 'order_value',
				type: 'Query',
				schema: z.enum(['Below5000', 'Upto25000', 'Upto50000', 'Above50000']).optional()
			},
			{
				name: 'buy_timeline',
				type: 'Query',
				schema: z.enum(['WithinWeek', 'Within15Days', 'WithinMonth']).optional()
			},
			{
				name: 'has_drug_licence',
				type: 'Query',
				schema: z.boolean().optional()
			},
			{
				name: 'has_gst',
				type: 'Query',
				schema: z.boolean().optional()
			},
			{
				name: 'gst_verified',
				type: 'Query',
				schema: z.boolean().optional()
			},
			{
				name: 'product_ranges',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'dosage_forms',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			}
		],
		response: BrowseMarketplaceResponse,
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/marketplace/leads/:id/purchase',
		alias: 'postApiv1platformmarketplaceleadsIdpurchase',
		description: `Debits 1 credit from the caller&#x27;s tenant lead-credit balance + transfers
the lead to the tenant&#x27;s CRM (via the LeadPurchasedV1 event consumed by CRM).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ amount_paisa: z.number().int().gte(1) }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: PurchaseLeadResponse,
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `The route does not support the &#x60;X-Tenant-Id&#x60; operator scope (it acts on the
caller&#x27;s own tenant only) and the header selected a different tenant
(&#x60;tenant_scope_not_supported&#x60;, ADR 0039).
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Lead already sold OR credit-row concurrency conflict`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/persons',
		alias: 'getApiv1platformpersons',
		requestFormat: 'json',
		parameters: [
			{
				name: 'email',
				type: 'Query',
				schema: z.string().email()
			}
		],
		response: PersonDto,
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/persons/:personId',
		alias: 'getApiv1platformpersonsPersonId',
		requestFormat: 'json',
		parameters: [
			{
				name: 'personId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: PersonDto
	},
	{
		method: 'post',
		path: '/api/v1/platform/persons/:personId/anonymise',
		alias: 'postApiv1platformpersonsPersonIdanonymise',
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'personId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/persons/:personId/global-suspend',
		alias: 'postApiv1platformpersonsPersonIdglobalSuspend',
		description: `Reason is mandatory per data-retention.md audit canon.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1) }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'personId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/persons/:personId/lift-global-suspension',
		alias: 'postApiv1platformpersonsPersonIdliftGlobalSuspension',
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'personId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/persons/:personId/memberships',
		alias: 'getApiv1platformpersonsPersonIdmemberships',
		requestFormat: 'json',
		parameters: [
			{
				name: 'personId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: ListPersonMembershipsResponse,
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/platform/persons/:personId/profile',
		alias: 'patchApiv1platformpersonsPersonIdprofile',
		description: `Updates Person.FirstName / Person.LastName — distinct from the
per-Tenant designation/department/status_message which move via
PATCH /api/v1/users/{userId}/profile.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdatePersonProfileRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'personId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/stats',
		alias: 'getApiv1platformstats',
		requestFormat: 'json',
		parameters: [
			{
				name: 'delta_window',
				type: 'Query',
				schema: z.enum(['', '24h', '7d', '30d']).optional().default('')
			}
		],
		response: PlatformStatsResponse
	},
	{
		method: 'get',
		path: '/api/v1/platform/tenants',
		alias: 'getApiv1platformtenants',
		requestFormat: 'json',
		response: ListAllTenantsResponse
	},
	{
		method: 'delete',
		path: '/api/v1/platform/tenants/:tenantId',
		alias: 'deleteApiv1platformtenantsTenantId',
		description: `Bypasses the marked-for-deletion lifecycle. Tenants holding an
active SuperAdmin role refuse with 422
(&#x60;platform_tenant_undeletable&#x60;).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/unverified-contacts',
		alias: 'postApiv1platformunverifiedContacts',
		description: `Lead Agent registers a new prospect for verification.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateUnverifiedContactRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: z.object({ contact_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/unverified-contacts',
		alias: 'getApiv1platformunverifiedContacts',
		description: `Cursor-paginated list of contacts. Optional &#x60;status&#x60; filter.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'status',
				type: 'Query',
				schema: z.enum(['new', 'in_call', 'verified', 'rejected', 'busy']).optional()
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			}
		],
		response: ListUnverifiedContactsResponse,
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/unverified-contacts/:id/calls',
		alias: 'postApiv1platformunverifiedContactsIdcalls',
		description: `Records one call attempt against the contact. When &#x60;outcome&#x3D;busy&#x60;,
callback window fields are required; otherwise they MUST be omitted.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: LogVerificationCallRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.object({ call_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/unverified-contacts/:id/reject',
		alias: 'postApiv1platformunverifiedContactsIdreject',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1) }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/unverified-contacts/:id/verify',
		alias: 'postApiv1platformunverifiedContactsIdverify',
		description: `Refuses with 409 (&#x60;contact_already_terminal&#x60;) when the contact
is already in a terminal state (Verified or Rejected) — the
handler will NOT emit a duplicate &#x60;LeadVerifiedV1&#x60; /
fabricate a phantom PlatformLead. Per ADR 0059 review-pass
H11.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: z.object({ platform_lead_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Contact already in a terminal state (Verified or Rejected)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/roles',
		alias: 'getApiv1roles',
		description: `Requires &#x60;identity.roles.view&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListRolesResponse,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/roles',
		alias: 'postApiv1roles',
		description: `Requires &#x60;identity.roles.create&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateRoleRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ role_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/roles/:roleId',
		alias: 'getApiv1rolesRoleId',
		description: `Requires &#x60;identity.roles.view&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'roleId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: RoleDto,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/roles/:roleId',
		alias: 'patchApiv1rolesRoleId',
		description: `Both fields optional. Empty &#x60;name&#x60; skips rename. Omitting
&#x60;hierarchy_level&#x60; (or sending &#x60;null&#x60;) skips re-level — using a
pointer field instead of a -1 sentinel keeps the wire shape clean.
Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateRoleRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'roleId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Role name already taken in this tenant`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/roles/:roleId',
		alias: 'deleteApiv1rolesRoleId',
		description: `Requires &#x60;identity.roles.delete&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'roleId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/roles/:roleId/parent',
		alias: 'patchApiv1rolesRoleIdparent',
		description: `ADR 0058 (Wave 9.4, supersedes ADR 0054) — single-parent
organizational hierarchy backed by a dedicated
&#x60;identity.role_hierarchy_edges&#x60; aggregate. Permission
resolution stays flat per role; the hierarchy is consumed by
approval workflows + reporting.

Pass &#x60;{&quot;parent_role_id&quot;: null}&#x60; (or omit / empty string) to
clear the parent (role becomes a root). Pass a UUID referencing
a role in the SAME tenant to set / re-point the parent.

Cycle prevention + cross-tenant safety are declarative at the
DB layer (composite FK + cycle trigger). Surfaces as 422
&#x60;role_hierarchy_cycle&#x60; / &#x60;role_hierarchy_cross_tenant&#x60;, 400
&#x60;role_hierarchy_self_reference&#x60;, 409
&#x60;role_hierarchy_edge_already_exists&#x60;.

Optional &#x60;reason&#x60; (10-1024 chars) is recorded onto the new
edge OR the cleared edge for audit.
Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: SetRoleParentRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'roleId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Role already has an active parent edge (single-parent
invariant: at most one active edge per child). Caller
should reload to discover the existing edge before
retrying.
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'put',
		path: '/api/v1/roles/:roleId/permissions',
		alias: 'putApiv1rolesRoleIdpermissions',
		description: `Permission names MUST match the closed
&#x60;permission.IdentityPermissions&#x60; catalogue; unknown names surface
as 422 (&#x60;permission_unknown&#x60;).
Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Conferring a permission the caller does not hold is rejected with &#x60;grant_exceeds_authority&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ReplaceRolePermissionsRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'roleId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/roles/:roleId/permissions/grant',
		alias: 'postApiv1rolesRoleIdpermissionsgrant',
		description: `Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Conferring a permission the caller does not hold is rejected with &#x60;grant_exceeds_authority&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ permission: z.string() }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'roleId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/roles/:roleId/permissions/revoke',
		alias: 'postApiv1rolesRoleIdpermissionsrevoke',
		description: `Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ permission: z.string() }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'roleId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/search',
		alias: 'getApiv1search',
		requestFormat: 'json',
		parameters: [
			{
				name: 'q',
				type: 'Query',
				schema: z.string().min(2).max(100)
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(20).optional().default(5)
			},
			{
				name: 'include',
				type: 'Query',
				schema: z.string().optional().default('persons,tenants')
			}
		],
		response: SearchResponse,
		errors: [
			{
				status: 400,
				description: `Query too short or invalid include list`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tasks/work-items',
		alias: 'postApiv1tasksworkItems',
		description: `Creates a new manual task in the caller&#x27;s tenant. The caller&#x27;s
membership becomes the AssignedByMembershipID; the request body&#x27;s
&#x60;assigned_to_membership_id&#x60; must reference an active membership in
the same tenant (otherwise 422 &#x60;assignee_inactive&#x60;). Emits
&#x60;tasks.work_item_created.v1&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateWorkItemRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.object({ work_item_id: z.string().uuid() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/tasks/work-items',
		alias: 'getApiv1tasksworkItems',
		description: `Cursor-paginated list. Callers WITHOUT &#x60;tasks.work_items.read_all&#x60;
see only their own tasks (a &#x60;?assignee&#x3D;&#x60; that points elsewhere
returns 403).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'state',
				type: 'Query',
				schema: z.enum(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']).optional()
			},
			{
				name: 'type',
				type: 'Query',
				schema: z
					.enum(['manual', 'callback_reminder', 'reorder_reminder', 'follow_up', 'custom'])
					.optional()
			},
			{
				name: 'priority',
				type: 'Query',
				schema: z.enum(['low', 'medium', 'high', 'urgent']).optional()
			},
			{
				name: 'assignee',
				type: 'Query',
				schema: z.string().uuid().optional()
			},
			{
				name: 'batch_id',
				type: 'Query',
				schema: z.string().uuid().optional()
			},
			{
				name: 'due_before',
				type: 'Query',
				schema: z.string().datetime({ offset: true }).optional()
			},
			{
				name: 'due_after',
				type: 'Query',
				schema: z.string().datetime({ offset: true }).optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListWorkItemsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/tasks/work-items/:workItemId',
		alias: 'getApiv1tasksworkItemsWorkItemId',
		requestFormat: 'json',
		parameters: [
			{
				name: 'workItemId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: WorkItemDto,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tasks/work-items/:workItemId/cancel',
		alias: 'postApiv1tasksworkItemsWorkItemIdcancel',
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1).max(1000) }).passthrough()
			},
			{
				name: 'workItemId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Cannot cancel a completed task`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Reason missing`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tasks/work-items/:workItemId/complete',
		alias: 'postApiv1tasksworkItemsWorkItemIdcomplete',
		requestFormat: 'json',
		parameters: [
			{
				name: 'workItemId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Cannot complete a cancelled task`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tasks/work-items/:workItemId/reassign',
		alias: 'postApiv1tasksworkItemsWorkItemIdreassign',
		description: `Moves the task to a new membership. The caller must hold
&#x60;tasks.work_items.reassign&#x60; AND the new assignee must be in the
caller&#x27;s subordinate scope (or be the caller themselves). 403
&#x60;reassign_forbidden&#x60; otherwise.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ReassignWorkItemRequest
			},
			{
				name: 'workItemId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Cannot reassign a terminal task`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `New assignee not active in tenant`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tasks/work-items/:workItemId/start',
		alias: 'postApiv1tasksworkItemsWorkItemIdstart',
		requestFormat: 'json',
		parameters: [
			{
				name: 'workItemId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Work item is in a terminal / overdue state`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/tasks/work-items/dashboard',
		alias: 'getApiv1tasksworkItemsdashboard',
		description: `Returns the BRD §6.8 dashboard tallies. By default scoped to the
caller&#x27;s own tasks; pass &#x60;?include_team&#x3D;true&#x60; to expand to the
actor&#x27;s subordinate scope via the hierarchy traversal (requires
&#x60;tasks.work_items.read_all&#x60;).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'include_team',
				type: 'Query',
				schema: z.boolean().optional().default(false)
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: DashboardResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Only operators who
may use the header ever see it; every other caller has the header ignored.
`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/tenants',
		alias: 'getApiv1tenants',
		description: `Canonical slug-lookup per ADR 0052. Returns &#x60;{tenants: [0..1 match]}&#x60;.
Enumeration-safe per ADR 0044 — callers who lack access to the matched
tenant see an empty list, indistinguishable from &quot;no such slug.&quot;

Supersedes &#x60;GET /api/v1/tenants/by-slug/{slug}&#x60; (deprecated; grandfathered
for v0.2 frontend-contract compatibility per ADR 0049).

v0.2 supports &#x60;slug&#x60; only; future filters (&#x60;status&#x60;, &#x60;created_after&#x60;)
land per Stripe listing-endpoint canon.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'slug',
				type: 'Query',
				schema: z.string().min(1).max(64)
			}
		],
		response: ListTenantsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tenants',
		alias: 'postApiv1tenants',
		description: `Platform operators only (is_platform + slug anchor) — ADR 0068. Tenant
onboarding is operator-led (ADR 0053 &quot;no public sign-up surface&quot;).
Requires &#x60;platform.tenants.create&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RegisterTenantRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			}
		],
		response: RegisterTenantResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Email already has an active membership in another tenant`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the seconds to wait.`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/tenants/:tenantId',
		alias: 'getApiv1tenantsTenantId',
		description: `Requires &#x60;identity.tenants.view&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: TenantDto,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tenants/:tenantId/activate',
		alias: 'postApiv1tenantsTenantIdactivate',
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/tenants/:tenantId/admin-contact',
		alias: 'patchApiv1tenantsTenantIdadminContact',
		description: `Requires &#x60;identity.tenants.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateTenantAdminContactRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/tenants/:tenantId/audit/events',
		alias: 'getApiv1tenantsTenantIdauditevents',
		description: `Requires &#x60;identity.tenants.view&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListAuditEventsResponse,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/tenants/:tenantId/display-preferences',
		alias: 'patchApiv1tenantsTenantIddisplayPreferences',
		description: `Requires &#x60;identity.tenants.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateTenantDisplayPreferencesRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tenants/:tenantId/mark-for-deletion',
		alias: 'postApiv1tenantsTenantIdmarkForDeletion',
		description: `Schedules the tenant for hard-deletion after the retention window.
Reason is mandatory (DPDP §12 + SOC2 CC4.1 audit requirement).
Tenants holding an active SuperAdmin role refuse the transition
with 422 (&#x60;platform_tenant_undeletable&#x60;).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1) }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/tenants/:tenantId/profile',
		alias: 'patchApiv1tenantsTenantIdprofile',
		description: `Requires &#x60;identity.tenants.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateTenantProfileRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tenants/:tenantId/restore',
		alias: 'postApiv1tenantsTenantIdrestore',
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/tenants/:tenantId/settings',
		alias: 'patchApiv1tenantsTenantIdsettings',
		description: `Requires &#x60;identity.tenants.update_settings&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateTenantSettingsRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/tenants/:tenantId/statutory',
		alias: 'patchApiv1tenantsTenantIdstatutory',
		description: `Empty strings clear the corresponding declaration; the aggregate
accepts a zero Statutory VO for tenants that haven&#x27;t yet
onboarded their compliance IDs.
Requires &#x60;identity.tenants.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateTenantStatutoryRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tenants/:tenantId/suspend',
		alias: 'postApiv1tenantsTenantIdsuspend',
		description: `Reason is mandatory per data-retention.md audit canon.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1) }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'tenantId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/users',
		alias: 'getApiv1users',
		description: `Requires &#x60;identity.users.view&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().optional()
			},
			{
				name: 'page_size',
				type: 'Query',
				schema: z.number().int().gte(1).lte(200).optional().default(50)
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListUsersResponse,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users',
		alias: 'postApiv1users',
		description: `Requires &#x60;identity.users.create&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateUserRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: CreateUserResponse,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/users/:userId',
		alias: 'getApiv1usersUserId',
		description: `Requires &#x60;identity.users.view&#x60; or self (path id equals the caller&#x27;s membership) (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: UserDto,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users/:userId/anonymise',
		alias: 'postApiv1usersUserIdanonymise',
		description: `Cross-tenant blast radius — one Person can hold many Memberships;
the cascade is gated on Platform tier per multi-tenancy.md
&quot;SuperUser god-mode&quot; + &#x60;identity.users.anonymise&#x60; permission.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users/:userId/deactivate',
		alias: 'postApiv1usersUserIddeactivate',
		description: `Requires &#x60;identity.users.deactivate&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ reason: z.string().min(1) }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'put',
		path: '/api/v1/users/:userId/manager',
		alias: 'putApiv1usersUserIdmanager',
		description: `ManagerID MUST be a Membership in the same tenant — composite FK
at the schema layer enforces this; cross-tenant ID surfaces as 422.
Requires &#x60;identity.users.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ manager_id: z.string().uuid() }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/users/:userId/manager',
		alias: 'deleteApiv1usersUserIdmanager',
		description: `Requires &#x60;identity.users.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/users/:userId/permission-overrides',
		alias: 'patchApiv1usersUserIdpermissionOverrides',
		description: `Empty arrays clear the corresponding overlay. Permission names
MUST match the closed &#x60;permission.IdentityPermissions&#x60; catalogue;
unknown names surface as 422 (&#x60;permission_unknown&#x60;).
Requires &#x60;identity.users.update_permissions&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). Conferring a permission the caller does not hold is rejected with &#x60;grant_exceeds_authority&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ReplaceUserPermissionOverridesRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/users/:userId/profile',
		alias: 'patchApiv1usersUserIdprofile',
		description: `Requires &#x60;identity.users.update&#x60; or self (path id equals the caller&#x27;s membership) (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateUserProfileRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users/:userId/reactivate',
		alias: 'postApiv1usersUserIdreactivate',
		description: `Requires &#x60;identity.users.reactivate&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users/:userId/roles',
		alias: 'postApiv1usersUserIdroles',
		description: `Requires &#x60;identity.roles.assign&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). Conferring a permission the caller does not hold is rejected with &#x60;grant_exceeds_authority&#x60;. Only a super user may assign a super-admin role.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ role_id: z.string().uuid() }).passthrough()
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed id: &#x60;invalid_user_id&#x60; (path) or &#x60;invalid_role_id&#x60; (body &#x60;role_id&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `&#x60;role_not_found&#x60; — no live role with that id in the target tenant (or the user does not exist)`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/users/:userId/roles/:roleId',
		alias: 'deleteApiv1usersUserIdrolesRoleId',
		description: `Requires &#x60;identity.roles.revoke&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'roleId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: z.void(),
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			}
		]
	}
];
