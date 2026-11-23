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
		must_change_password: z.boolean()
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
		reason: z.string().optional(),
		current_version: z.number().int().optional(),
		errors: z.record(z.string(), z.array(z.string())).optional()
	})
	.passthrough();
export const RefreshRequest = z.object({ refresh_token: z.string() }).passthrough();
export const LogoutRequest = z
	.object({ refresh_token: z.string(), reason: z.string().optional() })
	.passthrough();
export const RequestPasswordResetRequest = z.object({ email: z.string().email() }).passthrough();
export const ResetPasswordRequest = z
	.object({ token: z.string(), new_password: z.string().min(8) })
	.passthrough();
export const ChangePasswordRequest = z
	.object({ current_password: z.string(), new_password: z.string().min(8) })
	.passthrough();
export const RequestEmailChangeRequest = z.object({ new_email: z.string().email() }).passthrough();
export const ConfirmEmailChangeRequest = z.object({ token: z.string() }).passthrough();
export const CapabilityRoleDto = z
	.object({ id: z.string().uuid(), name: z.string(), is_super_admin: z.boolean() })
	.passthrough();
export const PasswordRulesDto = z
	.object({
		min_length: z.number().int().gte(8).lte(128),
		max_length: z.number().int(),
		requires_uppercase: z.boolean(),
		requires_lowercase: z.boolean(),
		requires_digit: z.boolean(),
		requires_symbol: z.boolean()
	})
	.passthrough();
export const ImpersonationContextDto = z
	.object({ session_id: z.string().uuid(), tenant_display_name: z.string() })
	.passthrough();
export const CapabilitiesDto = z
	.object({
		person_id: z.string().uuid(),
		membership_id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		tenant_slug: z.string(),
		email: z.string().optional(),
		first_name: z.string().optional(),
		last_name: z.string().optional(),
		is_platform: z.boolean(),
		is_super_user: z.boolean(),
		must_change_password: z.boolean(),
		permissions: z.array(z.string()),
		effective_permissions: z.array(z.string()),
		roles: z.array(CapabilityRoleDto),
		rank: z.number().int().gte(0).lte(99),
		tier: z.enum(['owner', 'admin', 'manager', 'team_lead', 'user']),
		password_policy: PasswordRulesDto,
		impersonation: ImpersonationContextDto.optional()
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
		min_length: z.number().int().gte(8).lte(128),
		require_uppercase: z.boolean(),
		require_lowercase: z.boolean(),
		require_digit: z.boolean(),
		require_symbol: z.boolean(),
		max_failed_attempts: z.number().int().gte(3).lte(50),
		lockout_minutes: z.number().int().gte(0).lte(1440)
	})
	.passthrough();
export const TenantDto = z
	.object({
		id: z.string().uuid(),
		slug: z.string(),
		legal_name: z.string(),
		display_name: z.string(),
		status: z.enum(['pending', 'active', 'suspended', 'pending_deletion', 'deleted']),
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
			.min(3)
			.max(63)
			.regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
		legal_name: z.string().max(200),
		display_name: z.string().max(200),
		admin_email: z.string().email(),
		admin_password: z.string().min(8),
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
	.passthrough();
export const UpdateTenantStatutoryRequest = z
	.object({ gst_number: z.string(), pan_number: z.string(), drug_licence_number: z.string() })
	.passthrough();
export const AdminAddressInput = z
	.object({
		street: z.string(),
		city: z.string(),
		district: z.string(),
		state: z.string(),
		state_code: z.string(),
		pincode: z.string()
	})
	.passthrough();
export const UpdateTenantAdminContactRequest = z
	.object({ phone: z.string(), address: AdminAddressInput })
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
	.passthrough();
export const SuspendTenantRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const MarkTenantForDeletionRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const GrantedOverrideDto = z
	.object({ name: z.string(), expires_at: z.string().datetime({ offset: true }).optional() })
	.passthrough();
export const UserPermissionOverridesDto = z
	.object({ granted: z.array(GrantedOverrideDto), revoked: z.array(z.string()) })
	.passthrough();
export const UserDto = z
	.object({
		membership_id: z.string().uuid(),
		person_id: z.string().uuid(),
		tenant_id: z.string().uuid(),
		email: z.string(),
		first_name: z.string(),
		last_name: z.string(),
		status: z.enum(['active', 'inactive']),
		designation: z.string().optional(),
		department: z.string().optional(),
		status_message: z.string().optional(),
		joined_at: z.string().datetime({ offset: true }).optional(),
		left_at: z.string().datetime({ offset: true }).optional(),
		reports_to: z.string().uuid().optional(),
		role_ids: z.array(z.string().uuid()),
		permission_overrides: UserPermissionOverridesDto.optional(),
		overrides_version: z.string().optional()
	})
	.passthrough();
export const ListUsersResponse = z
	.object({
		users: z.array(UserDto),
		has_more: z.boolean(),
		next_cursor: z.string().optional(),
		status_counts: z
			.object({ active: z.number().int(), inactive: z.number().int() })
			.passthrough()
			.optional()
	})
	.passthrough();
export const CreateUserRequest = z
	.object({
		email: z.string().email(),
		password: z.string().min(8),
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
export const MemberHitDto = z
	.object({
		membership_id: z.string().uuid(),
		display_name: z.string(),
		designation: z.string().optional()
	})
	.passthrough();
export const SearchMembersResponse = z.object({ members: z.array(MemberHitDto) }).passthrough();
export const UpdateUserProfileRequest = z
	.object({
		designation: z.string().max(120),
		department: z.string().max(120),
		status_message: z.string().max(280)
	})
	.passthrough();
export const DeactivateUserRequest = z.object({ reason: z.string().min(1) }).passthrough();
export const AssignUserRoleRequest = z.object({ role_id: z.string().uuid() }).passthrough();
export const ReplaceUserPermissionOverridesRequest = z
	.object({
		granted: z.array(z.string()),
		revoked: z.array(z.string()),
		overrides_version: z.string().min(1)
	})
	.passthrough();
export const AssignUserManagerRequest = z.object({ manager_id: z.string().uuid() }).passthrough();
export const AnonymiseRequest = z.object({ reason: z.string().min(1) }).passthrough();
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
		hierarchy_level: z.number().int().gte(1).lte(99),
		parent_role_id: z.string().uuid().optional()
	})
	.passthrough();
export const CreateRoleResponse = z.object({ role_id: z.string().uuid() }).passthrough();
export const UpdateRoleRequest = z
	.object({
		name: z.string().min(2).max(100),
		hierarchy_level: z.number().int().gte(1).lte(99).nullable()
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
		email: z.string(),
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
		tenant_display_name: z.string(),
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
		tenant_display_name: z.string(),
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
		email: z.string(),
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
		updated_at: z.string().datetime({ offset: true }),
		can_approve: z.boolean().optional()
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
		hsn_code: z
			.string()
			.min(4)
			.max(8)
			.regex(/^([0-9]{4}|[0-9]{6}|[0-9]{8})$/),
		gst_rate_bps: z.number().int().gte(0).lte(10000).optional(),
		manufacturer: z.string().max(200).optional(),
		product_category: z.string().max(64).optional(),
		reorder_level: z.number().int().gte(0).lte(2147483647).optional().default(0),
		expiry_alert_threshold_days: z.number().int().gte(0).lte(36500).optional().default(90)
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
		updated_at: z.string().datetime({ offset: true }),
		product_category: z.string().min(1).max(64),
		reorder_level: z.number().int().gte(0).lte(2147483647),
		expiry_alert_threshold_days: z.number().int().gte(0).lte(36500),
		stock_on_hand: z.number().int().gte(0),
		stock_reserved: z.number().int().gte(0),
		stock_available: z.number().int().gte(0),
		earliest_expiry: z.string().datetime({ offset: true }).optional()
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
		manufacturer: z.string().max(200),
		product_category: z.string().max(64),
		reorder_level: z.number().int().gte(0).lte(2147483647),
		expiry_alert_threshold_days: z.number().int().gte(0).lte(36500)
	})
	.partial()
	.passthrough();
export const ProductCategoryDto = z
	.object({
		category: z.string().min(1).max(64),
		default_gst_rate_bps: z.number().int().gte(0).lte(10000)
	})
	.passthrough();
export const ListProductCategoriesResponse = z
	.object({ items: z.array(ProductCategoryDto) })
	.passthrough();
export const AddBatchRequest = z
	.object({
		batch_number: z.string().min(1).max(100),
		manufacture_date: z.string().datetime({ offset: true }),
		expiry_date: z.string().datetime({ offset: true }),
		manufacturer_name: z.string().min(1).max(200),
		manufacturing_licence_number: z.string().min(1).max(100),
		mrp_paise: z.number().int().gte(0),
		purchase_price_paise: z.number().int().gte(0),
		initial_quantity: z.number().int().gte(0).optional()
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
		quantity_reserved: z.number().int().gte(0),
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
		type: z.enum(['inbound', 'outbound', 'adjustment']),
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
		carrier_name: z.string().min(1).max(200),
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
export const CompanyGstRateDto = z
	.object({
		id: z.string().uuid(),
		rate_bps: z.number().int().gte(0).lte(10000),
		label: z.string().max(40),
		confirmed_by: z.string().max(120),
		confirmed_on: z.string(),
		active: z.boolean()
	})
	.passthrough();
export const CompanyCommercePolicy = z
	.object({
		expiry: z
			.object({
				stop_months_before: z.number().int().gte(0).lte(24),
				warning_days: z.array(z.number().int().gte(1).lte(730)).max(4)
			})
			.passthrough(),
		fulfilment: z
			.object({
				shortage_allowed: z
					.array(z.enum(['hold', 'refuse', 'partial_backorder', 'partial_reduce']))
					.min(1),
				shortage_default: z.enum(['hold', 'refuse', 'partial_backorder', 'partial_reduce']),
				hold_keeps_available: z.boolean(),
				invoice_timing: z.enum(['at_pack', 'at_dispatch'])
			})
			.passthrough(),
		pricing: z
			.object({
				rate_override: z.boolean(),
				discount_enabled: z.boolean(),
				discount_max_bps: z.number().int().gte(0).lte(10000),
				scheme_enabled: z.boolean(),
				scheme_valuation: z.enum(['free_quantity', 'discount_equivalent'])
			})
			.passthrough(),
		invoice: z.object({ round_off: z.enum(['none', 'nearest_rupee']) }).passthrough(),
		tax: z
			.object({
				gst_rates: z.array(CompanyGstRateDto),
				credit_note_split: z.enum(['pro_rata', 'manual_by_rate']),
				annual_return_filed: z.record(z.string(), z.string())
			})
			.passthrough(),
		doc: z
			.object({
				invoice_prefix: z.string().regex(/^[A-Z0-9]{1,4}$/),
				credit_note_prefix: z.string().regex(/^[A-Z0-9]{1,4}$/)
			})
			.passthrough(),
		einvoice: z.object({ mode: z.enum(['off', 'manual_irn']) }).passthrough(),
		eway: z.object({ enforcement: z.enum(['warn', 'block']) }).passthrough(),
		payment: z
			.object({
				advance_mode: z.enum(['none', 'any_amount', 'percent', 'fixed']),
				advance_value: z.number().int().gte(0),
				part_payments: z.boolean(),
				overpayment: z.enum(['refuse', 'customer_credit', 'refund_due']),
				dispatch_gate: z.enum(['none', 'advance_met', 'full_payment']),
				completion_rule: z.enum(['full_payment', 'on_delivery'])
			})
			.passthrough(),
		credit: z
			.object({
				enabled: z.boolean(),
				enforcement: z.enum(['warn', 'block']),
				default_limit_paise: z.number().int().gte(0),
				default_terms_days: z.number().int().gte(0).lte(365),
				block_on_overdue: z.boolean(),
				overdue_grace_days: z.number().int().gte(0).lte(365)
			})
			.passthrough(),
		drug_schedule: z.object({ mode: z.enum(['off', 'optional', 'required']) }).passthrough()
	})
	.passthrough();
export const CompanySettingOption = z
	.object({
		key: z.string(),
		group: z.string(),
		kind: z.enum(['int', 'bool', 'enum', 'enum_set', 'int_list', 'code', 'date_map']),
		options: z.array(z.string()).optional(),
		min: z.number().int().optional(),
		max: z.number().int().optional(),
		max_items: z.number().int().optional(),
		default: z.unknown(),
		permission: z.enum(['manage', 'tax.manage'])
	})
	.passthrough();
export const CompanySettingsDto = z
	.object({
		tenant_id: z.string().uuid(),
		version: z.number().int(),
		policy: CompanyCommercePolicy,
		options: z.array(CompanySettingOption),
		updated_at: z.string().datetime({ offset: true }).optional(),
		updated_by_membership_id: z.string().uuid().optional()
	})
	.passthrough();
export const PatchCompanySettingsRequest = z
	.object({
		expected_version: z.number().int().gte(0),
		reason: z.string().max(500).optional(),
		changes: z.record(z.string(), z.object({}).partial().passthrough())
	})
	.passthrough();
export const CompanySettingsHistoryEntry = z
	.object({
		version: z.number().int(),
		policy: CompanyCommercePolicy,
		changed_keys: z.array(z.string()),
		reason: z.string(),
		actor_membership_id: z.string().uuid().optional(),
		impersonator_operator_id: z.string().optional(),
		changed_at: z.string().datetime({ offset: true })
	})
	.passthrough();
export const ListCompanySettingsHistoryResponse = z
	.object({
		items: z.array(CompanySettingsHistoryEntry),
		has_more: z.boolean(),
		next_cursor: z.string().optional()
	})
	.passthrough();
export const ListCompanyGstRatesResponse = z
	.object({ policy_version: z.number().int(), items: z.array(CompanyGstRateDto) })
	.passthrough();
export const CreateCompanyGstRateRequest = z
	.object({
		rate_bps: z.number().int().gte(0).lte(10000),
		label: z.string().max(40),
		confirmed_by: z.string().max(120),
		confirmed_on: z.string(),
		reason: z.string().max(500)
	})
	.passthrough();
export const CompanyGstRateChangedDto = CompanyGstRateDto.and(
	z.object({ policy_version: z.number().int() }).passthrough()
);
export const PatchCompanyGstRateRequest = z
	.object({
		label: z.string().max(40).optional(),
		confirmed_by: z.string().max(120).optional(),
		confirmed_on: z.string().optional(),
		active: z.boolean().optional(),
		reason: z.string().max(500)
	})
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
	PasswordRulesDto,
	ImpersonationContextDto,
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
	AdminAddressInput,
	UpdateTenantAdminContactRequest,
	UpdateTenantSettingsRequest,
	UpdateTenantDisplayPreferencesRequest,
	SuspendTenantRequest,
	MarkTenantForDeletionRequest,
	GrantedOverrideDto,
	UserPermissionOverridesDto,
	UserDto,
	ListUsersResponse,
	CreateUserRequest,
	CreateUserResponse,
	MemberHitDto,
	SearchMembersResponse,
	UpdateUserProfileRequest,
	DeactivateUserRequest,
	AssignUserRoleRequest,
	ReplaceUserPermissionOverridesRequest,
	AssignUserManagerRequest,
	AnonymiseRequest,
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
	ProductCategoryDto,
	ListProductCategoriesResponse,
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
	MarkAllReadResponse,
	CompanyGstRateDto,
	CompanyCommercePolicy,
	CompanySettingOption,
	CompanySettingsDto,
	PatchCompanySettingsRequest,
	CompanySettingsHistoryEntry,
	ListCompanySettingsHistoryResponse,
	ListCompanyGstRatesResponse,
	CreateCompanyGstRateRequest,
	CompanyGstRateChangedDto,
	PatchCompanyGstRateRequest
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
		description: `Current password verified even when authenticated (security.md &quot;Password change&quot;).
Allowed while &#x60;must_change_password&#x60; is pending: this is the way out of the
forced-change state. The change rotates the security stamp, clears the flag and,
in the same transaction, revokes EVERY refresh session of the person (the access
token carries no session id, so the caller&#x27;s own session is ended too).
Contract: &#x60;204&#x60;; the access token used is now &#x60;401 stale_token&#x60; (at once on every instance
when the api&#x27;s cache is reachable, otherwise within the 30 s lifetime of the cached
stamp); every refresh
token the person held is now &#x60;401&#x60; on refresh; the caller signs in again with the
new password, and that login (and its refreshes) carries no flag.

The new password is checked against the password policy of the caller&#x27;s OWN tenant
(the token&#x27;s &#x60;tenant_id&#x60;, never an operator&#x27;s acted-on scope; the default policy when
that tenant is gone) BEFORE the current password is verified, so a refused password
costs no hashing: &#x60;422 password_policy_violation&#x60; with &#x60;errors.new_password&#x60;. A current
password over 1024 bytes is answered as an incorrect one without being hashed.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ChangePasswordRequest
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
				description: `Incorrect current password, or the access token is stale (&#x60;stale_token&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;error: impersonation_not_allowed&#x60;. The token is an impersonation token; changing
a password is never reachable with one. (This operation is on the forced-change
allowlist, so &#x60;password_change_required&#x60; does not apply.)
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;password_policy_violation&#x60; (see PasswordPolicyViolation; field &#x60;errors.new_password&#x60;),
&#x60;password_breached&#x60;, or &#x60;password_same_as_current&#x60;.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			},
			{
				status: 503,
				description: `Every password-hashing slot of this process was busy for longer than the queue
timeout (the process bounds concurrent Argon2id work, ADR 0068 D12), or the caller&#x27;s
own address already had its share of operations running and a full line of waiting
ones. A caller&#x27;s operations beyond its share WAIT their turn (within the same queue
timeout) instead of failing, so a burst from one office address is served; only the
wait that runs out, or the line that is full, answers this. Nothing was done and
nothing was counted; retry after &#x60;Retry-After&#x60; seconds. Every login branch (real
account, unknown email, locked account) answers this the same way.
`,
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
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 403,
				description: `&#x60;tenant_suspended&#x60;: the password was CORRECT but the person&#x27;s company is
suspended (an operator suspended it; reactivation restores sign-in). It is
answered only after the password was verified, so a wrong password or an unknown
email still answers &#x60;401 invalid_credentials&#x60; and the code tells a stranger
nothing. &#x60;tenant_not_active&#x60;: the password was CORRECT but the company is
neither active nor suspended nor deleted, that is &#x60;pending&#x60; or marked for
deletion (&#x60;pending_deletion&#x60;); same rule (owner ruling 2026-11-21: only an active
company&#x27;s members sign in; restoring the company or an operator&#x27;s activation
brings them back). A company registered by an operator is created &#x60;active&#x60;, so
its first admin signs in. A deleted company, and one with no usable membership,
stay &#x60;401 invalid_credentials&#x60;.
`,
				schema: ErrorResponse
			},
			{
				status: 423,
				description: `Account locked after [person.MaxFailedLogins] consecutive
failed login attempts within [person.LockoutWindow] per
NIST 800-63B §5.2.2 + ADR 0053. Retry-After header carries
integer seconds until unlock (RFC 7231 §7.1.3 delta-seconds).
An email with no usable account (unknown, deactivated, anonymised, GLOBALLY
SUSPENDED) locks on the same schedule and answers identically, so 423 does not
reveal that an account exists (ADR 0068 D12). While locked, even the correct
password answers 423.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			},
			{
				status: 500,
				description: `Server error`,
				schema: ErrorResponse
			},
			{
				status: 503,
				description: `Every password-hashing slot of this process was busy for longer than the queue
timeout (the process bounds concurrent Argon2id work, ADR 0068 D12), or the caller&#x27;s
own address already had its share of operations running and a full line of waiting
ones. A caller&#x27;s operations beyond its share WAIT their turn (within the same queue
timeout) instead of failing, so a burst from one office address is served; only the
wait that runs out, or the line that is full, answers this. Nothing was done and
nothing was counted; retry after &#x60;Retry-After&#x60; seconds. Every login branch (real
account, unknown email, locked account) answers this the same way.
`,
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
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
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
		response: ListAuditEventsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;error: impersonation_not_allowed&#x60; (the token is an impersonation token, and this
account route is never reachable with one) or &#x60;error: password_change_required&#x60;
(the token carries &#x60;must_change_password&#x60;). Neither carries &#x60;WWW-Authenticate&#x60;.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/auth/me/capabilities',
		alias: 'getApiv1authmecapabilities',
		description: `Auth0 &#x60;/userinfo&#x60; canon. Returns JWT-resident fields (no DB hit) plus
cached profile enrichment (email + name + role names). The frontend
uses this to drive nav / tier / button-visibility without decoding
the JWT. Allowed while &#x60;must_change_password&#x60; is pending (the response
reports it, so the front-end can render the forced-change screen).

&#x60;password_policy&#x60; is the password policy that binds the caller: the policy
of the caller&#x27;s OWN tenant (the tenant of the token, never an operator&#x27;s
acted-on &#x60;X-Tenant-Id&#x60;, which this route ignores), the system default when
the tenant has none. The system default is 8 characters minimum with an upper-case
letter, a lower-case letter, a digit and a symbol (owner ruling 2026-11-21; it was 12;
8 is also the lowest minimum a tenant may set); a tenant that stored its own policy,
including a stored 12, keeps it. It is the same policy &#x60;POST /auth/change-password&#x60;
enforces, so the change-password page (including the forced screen) can show
the rules before the first attempt. It is read fresh on every call, not from
the cached bundle. An impersonation session reads this route and sees the
impersonated tenant&#x27;s rules (the token&#x27;s tenant is the impersonated one);
change-password itself is refused to it.

There is deliberately NO anonymous policy endpoint. The password-reset page
learns the rules only from the 422 &#x60;password_policy_violation&#x60; answer to a
reset made with a valid token (&#x60;errors&#x60; lists the failed rule codes): a
holder of a valid emailed token is the only anonymous party that is told
anything about the tenant&#x27;s settings, and the answer is limited to rule
codes.
`,
		requestFormat: 'json',
		response: CapabilitiesDto,
		errors: [
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/auth/refresh',
		alias: 'postApiv1authrefresh',
		description: `Rotates the refresh token and reissues the access token. Re-presenting a just-rotated token within the grace window (default 30 s, at most 120 s, &#x60;Refresh.GraceWindow&#x60;) returns the SAME successor (a deterministic derivation: no new token row is written), so two tabs or a retried request after a lost response do not end the session. That holds ONLY for the client that rotated the token (the client address the rate limiters use: behind the BFF its &#x60;X-Forwarded-For&#x60;; only a keyed hash of it is stored) and for at most 3 replays per token. A replay from another client, a 4th replay, a token whose consumer was not recorded, a replay outside the window, a token two or more generations old, or one whose successor has been used is token reuse: the whole family is revoked and the answer is &#x60;401 refresh_rejected&#x60;. A client whose address changes inside the window (a phone switching networks) between a lost response and its retry is therefore signed out. A revoked family never answers a replay, whatever the window says (logout, password change and reset revoke every family of the person). The answer to a replay is indistinguishable from the first answer, apart from the access token&#x27;s own issue time.
A session ends &#x60;Refresh.AbsoluteTTL&#x60; (default 14 days, &#x60;LEADKART_REFRESH__ABSOLUTE_TTL&#x60;) after the login that opened it, however often it was refreshed: the first refresh after that answers &#x60;401 refresh_rejected&#x60; with &#x60;reason: session_expired&#x60; (sign in again) and the family is revoked (&#x60;absolute_ttl&#x60;). A session also ends when it sits IDLE: each refresh token lives &#x60;Refresh.SlidingTTL&#x60; (default 24 hours, &#x60;LEADKART_REFRESH__SLIDING_TTL&#x60;; a session unused for 24 hours ends) from its issue, never past the absolute deadline, and every rotation renews it (a grace replay does not). The first refresh after the token ran out answers the same &#x60;401 refresh_rejected&#x60; with &#x60;reason: session_expired&#x60; and the family is revoked (&#x60;idle_timeout&#x60;). A globally suspended person is refused (the family is revoked), and so is a member of a SUSPENDED company: &#x60;401 refresh_rejected&#x60; with &#x60;reason: tenant_suspended&#x60; (the family is revoked as &#x60;tenant_suspended&#x60;; a reactivated company&#x27;s members sign in again, the old session does not return). A member of a company that is &#x60;pending&#x60; or marked for deletion is refused the same way with &#x60;reason: tenant_not_active&#x60; (the family is revoked as &#x60;tenant_not_active&#x60;; a restored company&#x27;s members sign in again). A deleted company&#x27;s members are refused without a reason. Suspending a company or marking it for deletion also revokes its members&#x27; families (outbox subscriber), but an access token already issued stays valid until its own expiry (600 s).
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Refresh rejected (consumed / expired / family revoked / reuse). For a session that
ended by time (absolute lifetime or idle timeout) the body carries
&#x60;reason: session_expired&#x60;; for a member of a suspended company
&#x60;reason: tenant_suspended&#x60;; for a member of a pending or marked-for-deletion
company &#x60;reason: tenant_not_active&#x60;.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
A malformed new email is 400 &#x60;invalid_email&#x60; with &#x60;errors{new_email: [&quot;invalid_email&quot;]}&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ new_email: z.string().email() }).passthrough()
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
				description: `&#x60;error: impersonation_not_allowed&#x60; (the token is an impersonation token, and this
account route is never reachable with one) or &#x60;error: password_change_required&#x60;
(the token carries &#x60;must_change_password&#x60;). Neither carries &#x60;WWW-Authenticate&#x60;.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/auth/request-password-reset',
		alias: 'postApiv1authrequestPasswordReset',
		description: `ALWAYS returns 204 regardless of whether the email is registered (Auth0/Okta canon — defeats account
enumeration). The answer is released no earlier than a fixed 300 ms after the handler starts, so
response time does not reveal whether the address has an account either. The 300 ms is measured
from when the handler starts: the limiters and middleware before it are not included.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ email: z.string().email() }).passthrough()
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
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/auth/reset-password',
		alias: 'postApiv1authresetPassword',
		description: `The token is validated FIRST (state and expiry), before any password work: an unknown,
consumed, expired, or suspended-person&#x27;s token answers &#x60;400 reset_token_invalid&#x60;
whatever the password is (an expired pending reset is cleared), so the answer
reveals nothing about whether an account exists or which tenant it belongs to.
Only then is the new password checked against the policy of the tenant of the person&#x27;s
active membership (the default policy when there is none): only a holder of a live
token can see &#x60;422 password_policy_violation&#x60; (field &#x60;errors.new_password&#x60;) or
&#x60;422 password_breached&#x60;. A refused password leaves the token usable but counts: after
5 refusals the token is invalidated (&#x60;400 reset_token_invalid&#x60;), so a link cannot be
probed forever. There is no same-as-current check on a reset (with a valid token it
would be an oracle for the current password): resetting to the current password
succeeds.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ResetPasswordRequest
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
				description: `&#x60;password_policy_violation&#x60; (see PasswordPolicyViolation; field &#x60;new_password&#x60;)
or &#x60;password_breached&#x60;. (&#x60;password_same_as_current&#x60; is change-password only.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			},
			{
				status: 503,
				description: `Every password-hashing slot of this process was busy for longer than the queue
timeout (the process bounds concurrent Argon2id work, ADR 0068 D12), or the caller&#x27;s
own address already had its share of operations running and a full line of waiting
ones. A caller&#x27;s operations beyond its share WAIT their turn (within the same queue
timeout) instead of failing, so a burst from one office address is served; only the
wait that runs out, or the line that is full, answers this. Nothing was done and
nothing was counted; retry after &#x60;Retry-After&#x60; seconds. Every login branch (real
account, unknown email, locked account) answers this the same way.
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/auth/sessions',
		alias: 'getApiv1authsessions',
		requestFormat: 'json',
		response: ListSessionsResponse,
		errors: [
			{
				status: 403,
				description: `&#x60;error: impersonation_not_allowed&#x60; (the token is an impersonation token, and this
account route is never reachable with one) or &#x60;error: password_change_required&#x60;
(the token carries &#x60;must_change_password&#x60;). Neither carries &#x60;WWW-Authenticate&#x60;.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/auth/sessions',
		alias: 'deleteApiv1authsessions',
		description: `The body is optional; an empty body (or &#x60;except_current: false&#x60;) revokes every session of the caller, this one included. With &#x60;except_current: true&#x60; the session the access token was minted for (its &#x60;family_id&#x60; claim, set at login and kept by every refresh) is kept and only the others are revoked; &#x60;revoked_count&#x60; counts the sessions this call ended, never the kept one. A token that does not name its session (minted before the claim existed) cannot say which one to keep: 409 &#x60;current_session_unknown&#x60;, nothing is revoked, refresh the token and retry. A body that is present but not valid JSON, names a key the request does not have (&#x60;exceptCurrent&#x60; for &#x60;except_current&#x60;), has a value of the wrong type or holds a second JSON value is 400 &#x60;invalid_body&#x60; and nothing is revoked (it is never read as &quot;revoke everything&quot;). Only the access tokens already minted for the other sessions stay valid until they expire (up to 10 minutes).
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RevokeAllSessionsRequest
			}
		],
		response: z.object({ revoked_count: z.number().int() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;error: impersonation_not_allowed&#x60; (the token is an impersonation token, and this
account route is never reachable with one) or &#x60;error: password_change_required&#x60;
(the token carries &#x60;must_change_password&#x60;). Neither carries &#x60;WWW-Authenticate&#x60;.
`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `&#x60;current_session_unknown&#x60;: &#x60;except_current&#x60; was asked but the access token carries no session id; nothing was revoked. Refresh the token and retry.`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
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
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;error: impersonation_not_allowed&#x60; (the token is an impersonation token, and this
account route is never reachable with one) or &#x60;error: password_change_required&#x60;
(the token carries &#x60;must_change_password&#x60;). Neither carries &#x60;WWW-Authenticate&#x60;.
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `&#x60;session_not_found&#x60;: no such session, OR it belongs to another person. The two are
indistinguishable on purpose (no session-id enumeration); a session of the caller
that is already revoked is 204, not 404.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/company/commerce-settings',
		alias: 'getApiv1companycommerceSettings',
		description: `Requires &#x60;company_settings.read&#x60;. The company&#x27;s versioned commerce policy:
every business rule a company may choose (expiry, shortage handling, pricing,
tax and documents, payments and credit, drug schedule), the &#x60;version&#x60; the next
save must send as &#x60;expected_version&#x60;, and the option metadata of every
patchable setting (&#x60;options&#x60;: its kind, allowed values or bounds, default, and
the permission that changes it). A company with no stored policy reads the
defaults at &#x60;version: 0&#x60;. The GST rate list starts EMPTY (there is no default
rate); it changes through &#x60;/company/gst-rates&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: CompanySettingsDto,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/company/commerce-settings',
		alias: 'patchApiv1companycommerceSettings',
		description: `Requires &#x60;company_settings.manage&#x60; for the non-tax settings and
&#x60;company_settings.tax.manage&#x60; for the tax, document and compliance settings
(&#x60;options[].permission&#x60; names which); both are held only at the
Administrator tier or above. Supplied-key partial update: only the settings
in &#x60;changes&#x60; are applied, and a value equal to the current one changes
nothing (the version does not move). &#x60;expected_version&#x60; is the version the
form was loaded at; a stale one is &#x60;409 settings_version_conflict&#x60; (with
&#x60;current_version&#x60;) and nothing changes. A change to a tax, document or
compliance setting also needs &#x60;reason&#x60;. Every accepted change moves the policy
to a new version, records who changed what and why in the history, and
reaches Orders and Inventory by event. Returns &#x60;200&#x60; with the updated policy.
A refusal names the setting: &#x60;422 validation_failed&#x60; with
&#x60;errors{&quot;&lt;group&gt;.&lt;setting&gt;&quot;: [&lt;code&gt;]}&#x60; (codes: &#x60;out_of_range&#x60;, &#x60;invalid_type&#x60;,
&#x60;not_an_option&#x60;, &#x60;required&#x60;, &#x60;duplicate&#x60;, &#x60;too_many&#x60;, &#x60;not_in_allowed&#x60;,
&#x60;value_required&#x60;, &#x60;value_not_allowed&#x60;, &#x60;invalid_format&#x60;, &#x60;unknown_setting&#x60;,
&#x60;managed_elsewhere&#x60;) or on &#x60;reason&#x60;, &#x60;expected_version&#x60;, &#x60;changes&#x60;; nothing is
changed. Option sets and bounds: &#x60;GET&#x60; &#x60;options&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: PatchCompanySettingsRequest
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
		response: CompanySettingsDto,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `&#x60;settings_version_conflict&#x60;: the settings changed since the form was loaded; reload (&#x60;current_version&#x60;) and apply the change again`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/company/commerce-settings/history',
		alias: 'getApiv1companycommerceSettingshistory',
		description: `Requires &#x60;company_settings.read&#x60;. Append-only, newest version first: the whole
policy at each version, the keys that changed, the acting membership, the
impersonating operator if any, the reason and the time. Keyset-paginated
(&#x60;cursor&#x60;, &#x60;page_size&#x60;).
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
				schema: z.number().int().gte(1).lte(200).optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListCompanySettingsHistoryResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/company/gst-rates',
		alias: 'getApiv1companygstRates',
		description: `Requires &#x60;company_settings.read&#x60; OR &#x60;inventory.catalog.read&#x60; OR
&#x60;inventory.catalog.manage&#x60; (the picker a product form reads). The company&#x27;s
own list, in rate order; empty until the company adds a rate. &#x60;active&#x3D;true&#x60;
drops deactivated rates. &#x60;policy_version&#x60; is the policy version the list was
read at.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'active',
				type: 'Query',
				schema: z.boolean().optional()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListCompanyGstRatesResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/company/gst-rates',
		alias: 'postApiv1companygstRates',
		description: `Requires &#x60;company_settings.tax.manage&#x60; (Administrator tier or above). The
company confirms each rate by name (&#x60;confirmed_by&#x60;, &#x60;confirmed_on&#x60;);
LeadKart does not check a rate against the law. &#x60;reason&#x60; is required. The same
&#x60;rate_bps&#x60; under the same &#x60;label&#x60; (any case) is &#x60;422&#x60; with
&#x60;errors.label: [duplicate]&#x60;. Adding a rate moves the policy to a new version.
Returns &#x60;201&#x60; with the rate and the new &#x60;policy_version&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateCompanyGstRateRequest
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
		response: CompanyGstRateChangedDto,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/company/gst-rates/:rateId',
		alias: 'patchApiv1companygstRatesRateId',
		description: `Requires &#x60;company_settings.tax.manage&#x60; (Administrator tier or above). A rate is
deactivated (&#x60;active: false&#x60;), never deleted, because products and documents
refer to it; the rate itself (&#x60;rate_bps&#x60;) never changes: add a new rate
instead. Supplied-key partial update; &#x60;reason&#x60; is required. An edit that
changes nothing leaves the policy version where it is. Returns &#x60;200&#x60; with the
rate and the &#x60;policy_version&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: PatchCompanyGstRateRequest
			},
			{
				name: 'X-Command-Id',
				type: 'Header',
				schema: z.string().min(36).max(36).uuid().optional()
			},
			{
				name: 'rateId',
				type: 'Path',
				schema: z.string().uuid()
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: CompanyGstRateChangedDto,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		path: '/api/v1/crm/leads/:leadId',
		alias: 'getApiv1crmleadsLeadId',
		description: `Single-lead access follows the list rule: a caller without &#x60;crm.leads.read_all&#x60;
(and without operator reach) reaches only a lead assigned to their own
membership; any other lead answers 404 &#x60;lead_not_found&#x60;, exactly like a lead that
does not exist.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'leadId',
				type: 'Path',
				schema: z.string().uuid()
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
Single-lead access follows the list rule: a caller without &#x60;crm.leads.read_all&#x60;
(and without operator reach) reaches only a lead assigned to their own
membership; any other lead answers 404 &#x60;lead_not_found&#x60;, exactly like a lead that
does not exist.
The response echoes the canonical (lower-case, hyphenated) &#x60;assignee_membership_id&#x60;.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Lead is in a terminal stage (converted / lost)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;reason_too_long&#x60; — over 1000 bytes; &#x60;reason_invalid_characters&#x60; — the reason holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
Single-lead access follows the list rule: a caller without &#x60;crm.leads.read_all&#x60;
(and without operator reach) reaches only a lead assigned to their own
membership; any other lead answers 404 &#x60;lead_not_found&#x60;, exactly like a lead that
does not exist.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Lead is in a terminal stage`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;notes_too_long&#x60; — over 4000 bytes; &#x60;notes_invalid_characters&#x60; — the notes hold the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
Single-lead access follows the list rule: a caller without &#x60;crm.leads.read_all&#x60;
(and without operator reach) reaches only a lead assigned to their own
membership; any other lead answers 404 &#x60;lead_not_found&#x60;, exactly like a lead that
does not exist.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Lead is already in a terminal stage`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
Single-lead access follows the list rule: a caller without &#x60;crm.leads.read_all&#x60;
(and without operator reach) reaches only a lead assigned to their own
membership; any other lead answers 404 &#x60;lead_not_found&#x60;, exactly like a lead that
does not exist.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Lead is already in a terminal stage`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;reason_required&#x60; — reason missing; &#x60;reason_too_long&#x60; — over 1000 bytes (it used to be reported as &#x60;invalid_stage&#x60;); &#x60;reason_invalid_characters&#x60; — the reason holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
Single-lead access follows the list rule: a caller without &#x60;crm.leads.read_all&#x60;
(and without operator reach) reaches only a lead assigned to their own
membership; any other lead answers 404 &#x60;lead_not_found&#x60;, exactly like a lead that
does not exist.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
Routes that carry the tenant in the path (&#x60;/api/v1/tenants/{tenantId}/...&#x60;) are
exempt: the path is authoritative there, with or without the header.
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;invalid_due_at&#x60; — due_at missing or invalid; &#x60;notes_too_long&#x60; — notes over 2000 characters (it used to be reported as &#x60;invalid_due_at&#x60;); &#x60;notes_invalid_characters&#x60; — the notes hold the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
Single-lead access follows the list rule: a caller without &#x60;crm.leads.read_all&#x60;
(and without operator reach) reaches only a lead assigned to their own
membership; any other lead answers 404 &#x60;lead_not_found&#x60;, exactly like a lead that
does not exist.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Lead is in a terminal stage OR transition is not allowed`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;reason_invalid_characters&#x60; — the reason holds the NUL character (U+0000); otherwise &#x60;invalid_stage&#x60;`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
Single-lead access follows the list rule: a caller without &#x60;crm.leads.read_all&#x60;
(and without operator reach) reaches only a lead assigned to their own
membership; any other lead answers 404 &#x60;lead_not_found&#x60;, exactly like a lead that
does not exist.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Lead is in a terminal stage`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
assignee bucket per ADR 0060; probing another assignee is 403
&#x60;forbidden&#x60;. The route honours &#x60;X-Tenant-Id&#x60; (reads only), so it can
also answer the scope errors below.
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
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		path: '/api/v1/crm/reminders/:reminderId/cancel',
		alias: 'postApiv1crmremindersReminderIdcancel',
		description: `Flips state to &#x60;cancelled&#x60;. &#x60;reason&#x60; is REQUIRED (audit
doctrine). Refused on already-terminal reminders. Emits
&#x60;crm.reminder_cancelled.v1&#x60;.
A caller without &#x60;crm.leads.read_all&#x60; (and without operator reach) reaches only a
reminder assigned to their own membership; any other reminder answers 404
&#x60;reminder_not_found&#x60;.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Reminder is already in a terminal state`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;reason_required&#x60; — reason missing; &#x60;reason_too_long&#x60; — over 1000 characters (it used to be reported as &#x60;reason_required&#x60;); &#x60;reason_invalid_characters&#x60; — the reason holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
A caller without &#x60;crm.leads.read_all&#x60; (and without operator reach) reaches only a
reminder assigned to their own membership; any other reminder answers 404
&#x60;reminder_not_found&#x60;.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Reminder is already in a terminal state`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
Routes that carry the tenant in the path (&#x60;/api/v1/tenants/{tenantId}/...&#x60;) are
exempt: the path is authoritative there, with or without the header.
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;carrier_name_required&#x60;, &#x60;carrier_name_too_long&#x60; (over 200 characters), &#x60;box_count_invalid&#x60;, &#x60;weight_grams_invalid&#x60;, &#x60;expected_delivery_not_in_future&#x60;; otherwise &#x60;invalid_body&#x60;; &#x60;carrier_name_invalid_characters&#x60; — a control (NUL, CR, LF, TAB), direction-override or invisible character in the carrier name`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Invalid status transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Invalid status transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;docket_number_too_long&#x60; — over 100 characters; otherwise &#x60;invalid_body&#x60;; &#x60;docket_number_invalid_characters&#x60; — the docket number holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Invalid status transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;reason_too_long&#x60; — over 1000 characters; otherwise &#x60;invalid_body&#x60;; &#x60;reason_invalid_characters&#x60; — the reason holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Invalid status transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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

Only &#x60;inbound&#x60;, &#x60;outbound&#x60; and &#x60;adjustment&#x60; are accepted here.
&#x60;reservation&#x60; and &#x60;release&#x60; belong to the order saga; asking for
them (or any other type) is &#x60;422 invalid_movement_type&#x60;, nothing
written.
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;invalid_movement_type&#x60; — type is not inbound, outbound or adjustment (&#x60;reservation&#x60; and &#x60;release&#x60; are not public); otherwise validation (&#x60;validation_failed&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/inventory/product-categories',
		alias: 'getApiv1inventoryproductCategories',
		description: `Requires &#x60;inventory.catalog.read&#x60; OR &#x60;inventory.catalog.manage&#x60;.
The option list of the product form: every product category of the
platform reference table with the GST rate a new product in it takes
when &#x60;POST /inventory/products&#x60; sends no &#x60;gst_rate_bps&#x60;. The same
list for every company, in category-name order, not paginated.
Read-only: no rate or category is changed by this API.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: ListProductCategoriesResponse,
		errors: [
			{
				status: 400,
				description: `&#x60;X-Tenant-Id&#x60; is malformed or supplied more than once (&#x60;invalid_tenant_scope&#x60;), or
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
SKU collision. 422 on field-validation failure. A refusal of
&#x60;product_category&#x60;, &#x60;reorder_level&#x60; or &#x60;expiry_alert_threshold_days&#x60;
names the field: &#x60;422 validation_failed&#x60; with
&#x60;errors{&lt;field&gt;: [&lt;rule&gt;]}&#x60; (rules on &#x60;CreateProductRequest&#x60;); the
other fields still answer &#x60;validation_failed&#x60; with a message only.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `SKU already exists in this tenant`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/inventory/products',
		alias: 'getApiv1inventoryproducts',
		description: `Requires &#x60;inventory.catalog.read&#x60; OR &#x60;inventory.catalog.manage&#x60;.
Returns the live (non-deleted) products for the caller&#x27;s tenant.
The order is fixed: newest first, (created_at, id) DESC, keyset
paginated with &#x60;cursor&#x60; and &#x60;page_size&#x60;; there is no &#x60;sort&#x60;
parameter. Every item carries its stock totals and earliest expiry
(see &#x60;ProductDto&#x60;), read in the same statement as the page. Filters
narrow the result set and combine with AND. &quot;Today&quot; is the current
UTC date; a batch is expired when its expiry date is today or
earlier.
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
				name: 'category',
				type: 'Query',
				schema: z.string().max(64).optional()
			},
			{
				name: 'low_stock',
				type: 'Query',
				schema: z.enum(['true', 'false']).optional()
			},
			{
				name: 'expiring_within_days',
				type: 'Query',
				schema: z.number().int().gte(0).lte(36500).optional()
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
				description: `&#x60;invalid_query&#x60; — a malformed cursor, or a &#x60;search&#x60;, &#x60;dosage_form&#x60; or &#x60;manufacturer&#x60; filter holding the NUL character (&#x60;%00&#x60;; it used to be a 500); or a &#x60;category&#x60;, &#x60;low_stock&#x60; or &#x60;expiring_within_days&#x60; value the server cannot read, named in &#x60;errors{&lt;param&gt;: [&lt;rule&gt;]}&#x60; (rules on each parameter)`,
				schema: ErrorResponse
			},
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
invariant failure (out-of-range GST bps, oversized name, etc). A
refusal of &#x60;product_category&#x60;, &#x60;reorder_level&#x60; or
&#x60;expiry_alert_threshold_days&#x60; names the field: &#x60;422 validation_failed&#x60;
with &#x60;errors{&lt;field&gt;: [&lt;rule&gt;]}&#x60; (rules on &#x60;UpdateProductRequest&#x60;),
and nothing is changed.
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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

Opening stock: with &#x60;initial_quantity&#x60; above 0 the batch is created
already holding that many units, and one &#x60;inbound&#x60; movement (reason
&quot;Opening stock&quot;) is written to its ledger, both in ONE transaction:
either the batch exists with its stock, or nothing was written.
Without the field (or with 0) the batch starts empty, as before, and
stock is added later with &#x60;POST /inventory/batches/{batchId}/movements&#x60;.
Stock cannot be received into a batch that is already expired (the
rule of every &#x60;inbound&#x60; movement): &#x60;409 batch_expired&#x60;, and the batch
is NOT created.
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;already_exists&#x60; — batch_number already exists for this product; &#x60;batch_expired&#x60; — &#x60;initial_quantity&#x60; above 0 for a batch whose expiry date has passed (nothing is written)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;validation_failed&#x60; — a field is invalid. A negative &#x60;initial_quantity&#x60; names the field: &#x60;errors.initial_quantity: [too_small]&#x60;; the other fields answer with a message only. Nothing is written.`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 403,
				description: `&#x60;error: password_change_required&#x60;. The token carries &#x60;must_change_password&#x60;: the
person holds a temporary credential and must change it first. Only
&#x60;POST /api/v1/auth/change-password&#x60; and &#x60;GET /api/v1/auth/me/capabilities&#x60; are
reachable. The response carries no &#x60;WWW-Authenticate&#x60; (this is not a session
problem: do not refresh). Applies to every authenticated operation outside that
allowlist; operations that document a more specific 403 carry it in that
response&#x27;s description.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				description: `&#x60;error: password_change_required&#x60;. The token carries &#x60;must_change_password&#x60;: the
person holds a temporary credential and must change it first. Only
&#x60;POST /api/v1/auth/change-password&#x60; and &#x60;GET /api/v1/auth/me/capabilities&#x60; are
reachable. The response carries no &#x60;WWW-Authenticate&#x60; (this is not a session
problem: do not refresh). Applies to every authenticated operation outside that
allowlist; operations that document a more specific 403 carry it in that
response&#x27;s description.
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				description: `&#x60;error: password_change_required&#x60;. The token carries &#x60;must_change_password&#x60;: the
person holds a temporary credential and must change it first. Only
&#x60;POST /api/v1/auth/change-password&#x60; and &#x60;GET /api/v1/auth/me/capabilities&#x60; are
reachable. The response carries no &#x60;WWW-Authenticate&#x60; (this is not a session
problem: do not refresh). Applies to every authenticated operation outside that
allowlist; operations that document a more specific 403 carry it in that
response&#x27;s description.
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
				description: `Cannot mark a dismissed notification read`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
			}
		],
		response: z.object({ marked_read: z.number().int() }).passthrough(),
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;error: password_change_required&#x60;. The token carries &#x60;must_change_password&#x60;: the
person holds a temporary credential and must change it first. Only
&#x60;POST /api/v1/auth/change-password&#x60; and &#x60;GET /api/v1/auth/me/capabilities&#x60; are
reachable. The response carries no &#x60;WWW-Authenticate&#x60; (this is not a session
problem: do not refresh). Applies to every authenticated operation outside that
allowlist; operations that document a more specific 403 carry it in that
response&#x27;s description.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		response: z.object({ unread_count: z.number().int() }).passthrough(),
		errors: [
			{
				status: 401,
				description: `Missing or invalid bearer token`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;error: password_change_required&#x60;. The token carries &#x60;must_change_password&#x60;: the
person holds a temporary credential and must change it first. Only
&#x60;POST /api/v1/auth/change-password&#x60; and &#x60;GET /api/v1/auth/me/capabilities&#x60; are
reachable. The response carries no &#x60;WWW-Authenticate&#x60; (this is not a session
problem: do not refresh). Applies to every authenticated operation outside that
allowlist; operations that document a more specific 403 carry it in that
response&#x27;s description.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Order already terminal`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;reason_too_long&#x60; — over 1000 characters; otherwise validation (&#x60;validation_failed&#x60;); &#x60;reason_invalid_characters&#x60; — the reason holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Invalid state transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Invalid state transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		path: '/api/v1/orders/orders/:orderId/credit-notes',
		alias: 'postApiv1ordersordersOrderIdcreditNotes',
		description: `Post-delivery return (BRD §A-014). Mints a credit_note (partial amount
allowed) against the order&#x27;s invoice with a gapless number. Requires
&#x60;orders.orders.manage&#x60;. 404 if the order has no invoice.

The notes on one invoice (credit notes and the cancellation note
together) may never add up to more than the invoice&#x27;s grand total:
a note that would pass it is &#x60;422 credit_note_exceeds_invoice&#x60; and
nothing is written. The check counts the notes already issued and runs
under a lock, so two concurrent notes cannot both fit.
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
Routes that carry the tenant in the path (&#x60;/api/v1/tenants/{tenantId}/...&#x60;) are
exempt: the path is authoritative there, with or without the header.
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;credit_note_exceeds_invoice&#x60; — the notes on the invoice, this one included, would pass its grand total; &#x60;reason_too_long&#x60; — over 1000 characters; &#x60;credit_note_invalid&#x60; — a field is invalid; &#x60;reason_invalid_characters&#x60; — the reason holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Invalid transition or invoice already exists`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Invalid state transition`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Refused before the order changes state, with the rules the consignment note enforces: &#x60;carrier_name_required&#x60;, &#x60;carrier_name_too_long&#x60; (over 200 characters), &#x60;box_count_invalid&#x60; (not above 0), &#x60;weight_grams_invalid&#x60; (not above 0), &#x60;expected_delivery_not_in_future&#x60;. Otherwise validation (&#x60;validation_failed&#x60;).; &#x60;carrier_name_invalid_characters&#x60; — a control (NUL, CR, LF, TAB), direction-override or invisible character in the carrier name (a NUL used to pass and then fail the consignment note on every attempt)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		path: '/api/v1/orders/orders/:orderId/payments',
		alias: 'postApiv1ordersordersOrderIdpayments',
		description: `Kinds &#x60;full&#x60; and &#x60;refund&#x60; only. &#x60;kind: token&#x60; is refused with
&#x60;422 token_payment_route_required&#x60;: a token receipt must advance the
order, so it goes through &#x60;POST /orders/orders/{orderId}/token-payment&#x60;.
The order must exist in the caller&#x27;s company: an unknown id, or another
company&#x27;s order, is &#x60;404 order_not_found&#x60; and nothing is written (it
used to answer 201 and store a payment that belonged to no order).
Other payment rules (part payments, an amount over the balance, a state
check) are not enforced yet: they wait for an owner decision.
`,
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `&#x60;order_not_found&#x60; — no such order in the caller&#x27;s company (an unknown id or another company&#x27;s order); nothing is written`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Duplicate external reference`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;token_payment_route_required&#x60; — kind is &#x60;token&#x60;: use POST /orders/orders/{orderId}/token-payment; &#x60;external_reference_too_long&#x60; (over 100 characters), &#x60;notes_too_long&#x60; (over 2000); otherwise validation (&#x60;validation_failed&#x60;); &#x60;external_reference_invalid_characters&#x60; / &#x60;notes_invalid_characters&#x60; — the value holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;token_payment_already_recorded&#x60; — the order is already &#x60;token_paid&#x60;, so its token payment was recorded; nothing is written. &#x60;invalid_state_transition&#x60; — the order is in any other state (a later one, or cancelled). &#x60;payment_duplicate_reference&#x60; — the external reference was already recorded.`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;external_reference_too_long&#x60; (over 100 characters), &#x60;notes_too_long&#x60; (over 2000); otherwise validation (&#x60;validation_failed&#x60;). Nothing is written. Also &#x60;external_reference_invalid_characters&#x60; / &#x60;notes_invalid_characters&#x60; — the value holds the NUL character (U+0000)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		path: '/api/v1/orders/quotations',
		alias: 'postApiv1ordersquotations',
		description: `&#x60;customer_lead_id&#x60; and every &#x60;items[].product_id&#x60; must be UUIDs (any RFC 4122
spelling; stored and echoed in canonical form). A malformed one is 400
&#x60;invalid_body&#x60;; an absent one is the domain&#x27;s 422 validation error.
`,
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
Routes that carry the tenant in the path (&#x60;/api/v1/tenants/{tenantId}/...&#x60;) are
exempt: the path is authoritative there, with or without the header.
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;note_invalid_characters&#x60;, &#x60;sku_invalid_characters&#x60;, &#x60;description_invalid_characters&#x60; — the note, or an item&#x27;s SKU or description, holds the NUL character (U+0000; it used to be a 500); otherwise validation (&#x60;validation_failed&#x60;). Nothing is written.`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Quotation already rejected`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Quotation already approved`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;reason_invalid_characters&#x60; — the reason holds the NUL character (U+0000; it used to be a 500); otherwise validation (&#x60;validation_failed&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		path: '/api/v1/orders/quotations/:quotationId/revise',
		alias: 'postApiv1ordersquotationsQuotationIdrevise',
		description: `Every &#x60;items[].product_id&#x60; must be a UUID (any RFC 4122 spelling, stored in
canonical form); a malformed one is 400 &#x60;invalid_body&#x60;.
`,
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Quotation is terminal`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;note_invalid_characters&#x60;, &#x60;sku_invalid_characters&#x60;, &#x60;description_invalid_characters&#x60; — the note, or an item&#x27;s SKU or description, holds the NUL character (U+0000; it used to be a 500); otherwise validation (&#x60;validation_failed&#x60;). Nothing is written.`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		path: '/api/v1/permission-requests',
		alias: 'postApiv1permissionRequests',
		description: `Caller (the requester) asks for a time-bound elevated permission.
The named approver is the requester&#x27;s current manager
(&#x60;tenant_memberships.reports_to&#x60;); a requester with no manager is decided by anyone of
Administrator rank or above who outranks them (ADR 0069). Requires
&#x60;identity.meta.request_permission_elevation&#x60; (every seeded non-owner role holds it;
&#x60;tenant.admin&#x60; implies it): without it the route is 403 &#x60;forbidden&#x60;. An impersonation session
cannot submit (403 &#x60;impersonation_not_allowed&#x60;).
At most one pending request per (membership, permission) tuple.
&#x60;tenant.admin&#x60;, platform-reserved permissions and names outside the catalogue are not
requestable: they are conferred by role only, and the request is refused with 422
(&#x60;permission_not_requestable&#x60;). &#x60;identity.users.create&#x60; is requested only at the Administrator tier or
above (403 &#x60;admin_tier_required&#x60; below it; owner ruling 2026-11-21).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;permission_request_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				description: `&#x60;forbidden&#x60; (the caller lacks &#x60;identity.meta.request_permission_elevation&#x60;),
&#x60;admin_tier_required&#x60; (&#x60;identity.users.create&#x60; requested below the Administrator tier),
&#x60;impersonation_not_allowed&#x60;, or &#x60;X-Tenant-Id&#x60; selected a foreign tenant (&#x60;tenant_scope_not_supported&#x60;)
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
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/permission-requests',
		alias: 'getApiv1permissionRequests',
		description: `Default &#x60;role&#x3D;requester&#x60; returns the caller&#x27;s own history (all states).
&#x60;role&#x3D;approver&#x60; returns the Pending requests the caller may DECIDE under the authority policy
(ADR 0069): exactly those a deny by the caller would not refuse, so none of them answers 403
for authority reasons. One call examines a bounded window of the tenant&#x27;s pending requests
(at most &#x60;page_size&#x60;, capped at 100); a page may therefore hold fewer items than &#x60;page_size&#x60;
while &#x60;has_more&#x60; is true, and &#x60;next_cursor&#x60; continues after the last request examined.
Keyset-paginated per ADR 0038.
Every item of the approver queue carries &#x60;can_approve&#x60;: whether APPROVING it as asked would
pass for the caller (the stored permission is requestable and within their authority, decided on
the same stored facts approve uses). Deny is allowed for every listed item. A caller who can decide
nothing (below the Admin tier and without &#x60;identity.roles.approve&#x60;) gets an empty page; a manager
below the Admin tier sees only the requests of members who report to them.
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
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/permission-requests/:requestId',
		alias: 'getApiv1permissionRequestsRequestId',
		description: `Returns the request to the requester and to anyone who may decide it (the same eligibility
as deny, ADR 0069); every other caller, and a missing id, get the same 404 per ADR 0044
enumeration-safety canon.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `The route does not support the &#x60;X-Tenant-Id&#x60; operator scope (it acts on the
caller&#x27;s own tenant only) and the header selected a different tenant
(&#x60;tenant_scope_not_supported&#x60;, ADR 0039).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/permission-requests/:requestId/approve',
		alias: 'postApiv1permissionRequestsRequestIdapprove',
		description: `The body is optional (&#x60;decision_reason&#x60; only). A body that is present is read strictly: a misspelt key, a value of the wrong type or invalid JSON is 400 &#x60;invalid_body&#x60; and nothing is approved.

Transitions Pending → Approved AND confers exactly the STORED request&#x27;s permission on the
requester for the stored duration (single transaction under the tenant authority lock).
Decided by the authority policy (ADR 0069), never by the body: the requester&#x27;s manager who
holds &#x60;identity.roles.approve&#x60; AND the permission; or anyone of Administrator rank or above who
strictly outranks the requester (an Administrator may approve any requestable permission
without holding it, user lifecycle (create, update, deactivate, reactivate, unlock) included, except
role management and approval, changing a user&#x27;s permissions, tenant settings, marketplace purchase, recording
payments, payment and invoice access, tenant-wide visibility (read-all, users, roles, tenants, lead credits)
and the right to request elevation, which the Administrator must hold); or a super user / exempt operator
acting in ANOTHER tenant (in the platform tenant an operator follows rank like anyone else).
Never an impersonation session and never the requester. The approved grant ends no later than the
approver&#x27;s own when the approver holds the permission only through a time-bound override. A caller who
is not the requester and may not even deny the request (not its manager with &#x60;identity.roles.approve&#x60;,
not senior enough) is answered 404, like a request that does not exist. When the requested permission is on the
requester&#x27;s REVOKED list the approval is an un-revoke and additionally needs the authority to change
their overrides (act on the member and hold the permission itself): otherwise 403
&#x60;grant_exceeds_authority&#x60;, the request stays pending.

Check order: unknown request, or a caller who may not decide it (404) → authority over this permission (403, whatever the request&#x27;s state) → state
(409 &#x60;permission_request_not_pending&#x60;) → requestability (422 &#x60;permission_not_requestable&#x60;: a
stored request whose permission is not requestable, for example one submitted before that rule
existed, stays pending; the approver can deny it and the requester can cancel it) → requester
still active (409 &#x60;permission_request_requester_inactive&#x60;; the request stays pending).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;permission_request_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;decision_reason&#x60;, and nothing is written.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;grant_exceeds_authority&#x60; (the approver does not hold the permission, an Administrator lacks a
must-hold one, or the approval would lift a revoke without the Admin tier), &#x60;admin_tier_required&#x60;
(a request for &#x60;identity.users.create&#x60; from a member below the Administrator tier: nobody approves
it, the request stays pending and can be denied or cancelled), &#x60;self_modification_forbidden&#x60;
(own request), &#x60;impersonation_not_allowed&#x60;, &#x60;forbidden&#x60; (no valid or no longer active acting member), or
&#x60;tenant_scope_not_supported&#x60; (&#x60;X-Tenant-Id&#x60; selected a foreign tenant). Callers who may not decide the
request at all get 404 &#x60;permission_request_not_found&#x60;.
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
				description: `Request is not in pending state (&#x60;permission_request_not_pending&#x60;), or the requester can no longer receive the grant (&#x60;permission_request_requester_inactive&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `The route does not support the &#x60;X-Tenant-Id&#x60; operator scope (it acts on the
caller&#x27;s own tenant only) and the header selected a different tenant
(&#x60;tenant_scope_not_supported&#x60;, ADR 0039).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/permission-requests/:requestId/deny',
		alias: 'postApiv1permissionRequestsRequestIddeny',
		description: `Transitions Pending → Denied. &#x60;decision_reason&#x60; is REQUIRED on
Deny per ADR 0055 audit canon. Same eligibility and check order as Approve, except that the
denier need not hold the requested permission (nor &#x60;identity.roles.approve&#x60; as an Administrator).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;permission_request_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;decision_reason&#x60;, and nothing is written.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;self_modification_forbidden&#x60; (own request), &#x60;impersonation_not_allowed&#x60;, &#x60;forbidden&#x60;, or
&#x60;tenant_scope_not_supported&#x60; (&#x60;X-Tenant-Id&#x60; selected a foreign tenant). Callers who may not decide the
request get 404.
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
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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

Requires &#x60;platform.impersonation.manage&#x60; held by a platform-tenant operator; platform-tenant membership alone, and &#x60;platform.tenants.manage&#x60;, are refused with 403 &#x60;forbidden&#x60; (a session mints a &#x60;tenant.admin&#x60; token for the target tenant, so it has its own permission; &#x60;tenant.admin&#x60; never implies it).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;impersonation_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Target tenant not found`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/impersonation/sessions',
		alias: 'getApiv1platformimpersonationsessions',
		description: `Requires &#x60;platform.impersonation.manage&#x60; held by a platform-tenant operator; platform-tenant membership alone, and &#x60;platform.tenants.manage&#x60;, are refused with 403 &#x60;forbidden&#x60;.
`,
		requestFormat: 'json',
		response: ListImpersonationSessionsResponse,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/platform/impersonation/sessions/:sessionId',
		alias: 'deleteApiv1platformimpersonationsessionsSessionId',
		description: `Ends the session before its natural TTL. The scoped token issued
by POST /api/v1/platform/impersonation/sessions is invalidated
on the next request (security_stamp comparison via the
impersonation-session resolver).

Needs only the platform anchor (a slug-anchored, non-impersonation platform operator), not
&#x60;platform.impersonation.manage&#x60;: only the session&#x27;s own operator can end it (any other
session id is the idempotent 204 no-op), so an operator who lost the permission can still
close the session they opened. Principals that are not platform operators are refused with 403 &#x60;forbidden&#x60;.
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
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `The route does not support the &#x60;X-Tenant-Id&#x60; operator scope (it acts on the
caller&#x27;s own tenant only) and the header selected a different tenant
(&#x60;tenant_scope_not_supported&#x60;, ADR 0039).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/persons',
		alias: 'getApiv1platformpersons',
		description: `Requires &#x60;platform.users.view&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/persons/:personId',
		alias: 'getApiv1platformpersonsPersonId',
		description: `Requires &#x60;platform.users.view&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'personId',
				type: 'Path',
				schema: z.string().uuid()
			}
		],
		response: PersonDto,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `&#x60;person_not_found&#x60;`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/persons/:personId/anonymise',
		alias: 'postApiv1platformpersonsPersonIdanonymise',
		description: `Requires &#x60;identity.users.anonymise&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
An operator cannot change their own Person: the caller&#x27;s own &#x60;personId&#x60; is refused with 403 &#x60;self_modification_forbidden&#x60; (super users exempt).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;person_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				name: 'personId',
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
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;last_owner_protected&#x60; — the person is the only active owner of a tenant; nothing was changed. &#x60;person_memberships_changing&#x60; — the person&#x27;s memberships kept changing while the change was checked (a reactivation raced it); nothing was changed, retry`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/persons/:personId/global-suspend',
		alias: 'postApiv1platformpersonsPersonIdglobalSuspend',
		description: `Reason is mandatory per data-retention.md audit canon.

Requires &#x60;platform.users.manage&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
An operator cannot change their own Person: the caller&#x27;s own &#x60;personId&#x60; is refused with 403 &#x60;self_modification_forbidden&#x60; (super users exempt).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;person_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				name: 'personId',
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
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;last_owner_protected&#x60; — the person is the only active owner of a tenant; nothing was changed. &#x60;person_memberships_changing&#x60; — the person&#x27;s memberships kept changing while the change was checked (a reactivation raced it); nothing was changed, retry`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/platform/persons/:personId/lift-global-suspension',
		alias: 'postApiv1platformpersonsPersonIdliftGlobalSuspension',
		description: `Requires &#x60;platform.users.manage&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
An operator cannot change their own Person: the caller&#x27;s own &#x60;personId&#x60; is refused with 403 &#x60;self_modification_forbidden&#x60; (super users exempt).
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/persons/:personId/memberships',
		alias: 'getApiv1platformpersonsPersonIdmemberships',
		description: `Requires &#x60;platform.users.view&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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

Requires &#x60;platform.users.manage&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
An operator cannot change their own Person: the caller&#x27;s own &#x60;personId&#x60; is refused with 403 &#x60;self_modification_forbidden&#x60; (super users exempt).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;person_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;first_name&#x60;, &#x60;last_name&#x60;, and nothing is written. A full-replace body that re-sends a stored value UNCHANGED is accepted (a value stored before the rule existed never blocks an untouched save); only a changed value is checked.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/stats',
		alias: 'getApiv1platformstats',
		description: `Requires &#x60;platform.tenants.view&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'delta_window',
				type: 'Query',
				schema: z.enum(['', '24h', '7d', '30d']).optional().default('')
			}
		],
		response: PlatformStatsResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/platform/tenants',
		alias: 'getApiv1platformtenants',
		description: `Requires &#x60;platform.tenants.view&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
`,
		requestFormat: 'json',
		response: ListAllTenantsResponse,
		errors: [
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/platform/tenants/:tenantId',
		alias: 'deleteApiv1platformtenantsTenantId',
		description: `Bypasses the marked-for-deletion lifecycle. Tenants holding an
active SuperAdmin role refuse with 422
(&#x60;platform_tenant_undeletable&#x60;).

The transition to &#x60;deleted&#x60;, its &#x60;tenant_deleted&#x60; outbox event and the row delete
run in ONE transaction. A tenant that still has dependent records (members, roles,
...) is refused with 409 &#x60;tenant_has_dependents&#x60;: nothing is changed, the tenant
keeps its status and no event is published. Remove or reassign the dependents first;
there is no cascade.

Requires &#x60;identity.tenants.delete&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
The tenant comes from the path only: &#x60;X-Tenant-Id&#x60; is never applied here, and a
value that differs from the path tenant is 400 &#x60;tenant_scope_conflict&#x60;. The
operator is attributed on the outbox row (&#x60;act_operator_id&#x60;, reason &#x60;platform-route&#x60;).
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
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
				description: `The tenant still has dependent records (&#x60;tenant_has_dependents&#x60;); nothing was changed`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
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
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
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
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
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
				description: `Contact already in a terminal state (Verified or Rejected)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Field-level validation failure (RFC 9457 with &#x60;errors&#x60; map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/roles',
		alias: 'postApiv1roles',
		description: `Requires &#x60;identity.roles.create&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;role_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;name&#x60;, and nothing is written.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Role name already taken in this tenant (&#x60;role_name_taken&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;role_invalid&#x60; (name length, &#x60;hierarchy_level&#x60; outside 1-99) or &#x60;role_parent_not_eligible&#x60;
(the parent is missing, deleted, or not strictly more senior than the new role&#x27;s level).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 400,
				description: `&#x60;invalid_role_id&#x60; — the path id is not a role id`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `&#x60;role_not_found&#x60;`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/roles/:roleId',
		alias: 'patchApiv1rolesRoleId',
		description: `At least one of &#x60;name&#x60; and &#x60;hierarchy_level&#x60; is required: a body that carries neither (&#x60;{}&#x60;, &#x60;null&#x60;) is
&#x60;400 invalid_body&#x60;. An empty &#x60;name&#x60; skips rename; omitting &#x60;hierarchy_level&#x60; (or sending &#x60;null&#x60;) skips
re-level — using a pointer field instead of a -1 sentinel keeps the wire shape clean.
Changing what a role confers, re-levelling it or deleting it is acting on every member who holds it, active or
not: the caller must strictly outrank each holder (owners may act on owners) and must not hold the role
themself, except an owner, who may edit a custom role they hold (&#x60;insufficient_rank&#x60;,
&#x60;self_modification_forbidden&#x60;); a rename acts on nobody. Every active holder&#x27;s
session ends the way an authority change on the member does: their old token answers 401 &#x60;stale_token&#x60;, the
refresh succeeds with the new permissions and rank.
A re-level is refused with 422 &#x60;role_level_breaks_reporting&#x60; only when it would NEWLY break a reporting line: an
active holder that is strictly junior to their (active) manager would no longer be, or a direct report that is
strictly junior to a holder would no longer be. Lines that are already broken, and inactive managers or
reports, do not block it.
Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;role_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;name&#x60;, and nothing is written. A full-replace body that re-sends a stored value UNCHANGED is accepted (a value stored before the rule existed never blocks an untouched save); only a changed value is checked.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;role_name_taken&#x60;, or &#x60;role_system_default&#x60; (a system-default role, Company Owner among them, cannot be
renamed or re-levelled by anyone, super users included).
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;validation_failed&#x60; / &#x60;role_invalid&#x60;, or &#x60;role_level_breaks_reporting&#x60; (the new level would newly break a reporting
line of an active holder: no longer strictly junior to their manager, or a direct report no longer strictly
junior to the holder; lines already broken do not count).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/roles/:roleId',
		alias: 'deleteApiv1rolesRoleId',
		description: `Requires &#x60;identity.roles.delete&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
The caller must hold every permission the role carries (deleting removes them from every holder) and must
be allowed to act on every holder, active or not (answered before &#x60;role_in_use&#x60;).
A role still held by an ACTIVE member is refused with 409 &#x60;role_in_use&#x60; (&#x60;errors.active_holders&#x60; is the
count); a role held only by inactive members is deleted and their assignments are removed in the same
transaction.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;role_in_use&#x60; (an active member holds the role) or &#x60;role_system_default&#x60; (system-default roles cannot be deleted)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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

The &#x60;parent_role_id&#x60; key is REQUIRED (a body without it is 400
&#x60;invalid_body&#x60;): pass &#x60;{&quot;parent_role_id&quot;: null}&#x60; (or an empty string) to
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

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;role_hierarchy_invalid_reason&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;role_system_default&#x60; (a system-default role&#x27;s parent cannot change), or role already has an active parent edge (single-parent
invariant: at most one active edge per child). Caller
should reload to discover the existing edge before
retrying.
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;role_parent_not_eligible&#x60; (the parent is missing, deleted, in another tenant, or not strictly more
senior than the child), or a cycle / cross-tenant refusal.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'put',
		path: '/api/v1/roles/:roleId/permissions',
		alias: 'putApiv1rolesRoleIdpermissions',
		description: `The &#x60;permissions&#x60; key is REQUIRED and may not be &#x60;null&#x60;: &#x60;{}&#x60; and &#x60;{&quot;permissions&quot;: null}&#x60; are 400
&#x60;invalid_body&#x60;; an explicit &#x60;[]&#x60; clears the role. Changing the set requires the caller to hold every
permission added AND every permission removed.
Permission names MUST match the closed
&#x60;permission.IdentityPermissions&#x60; catalogue; unknown names surface
as 422 (&#x60;permission_unknown&#x60;).
Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Conferring a permission the caller does not hold is rejected with &#x60;grant_exceeds_authority&#x60;.
Changing what a role confers, re-levelling it or deleting it is acting on every ACTIVE member who holds it: the
caller must strictly outrank each active holder (owners may act on owners) and must not hold the role
themself (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); a rename acts on nobody. Every active holder&#x27;s
session ends the way an authority change on the member does: their old token answers 401 &#x60;stale_token&#x60;, the
refresh succeeds with the new permissions and rank.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;role_system_default&#x60; (system-default roles, Company Owner among them, cannot be changed by anyone)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/roles/:roleId/permissions/grant',
		alias: 'postApiv1rolesRoleIdpermissionsgrant',
		description: `Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Conferring a permission the caller does not hold is rejected with &#x60;grant_exceeds_authority&#x60;.
Changing what a role confers, re-levelling it or deleting it is acting on every ACTIVE member who holds it: the
caller must strictly outrank each active holder (owners may act on owners) and must not hold the role
themself (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); a rename acts on nobody. Every active holder&#x27;s
session ends the way an authority change on the member does: their old token answers 401 &#x60;stale_token&#x60;, the
refresh succeeds with the new permissions and rank.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;role_system_default&#x60; (system-default roles cannot be changed by anyone)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/roles/:roleId/permissions/revoke',
		alias: 'postApiv1rolesRoleIdpermissionsrevoke',
		description: `Requires &#x60;identity.roles.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
Changing what a role confers, re-levelling it or deleting it is acting on every ACTIVE member who holds it: the
caller must strictly outrank each active holder (owners may act on owners) and must not hold the role
themself (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); a rename acts on nobody. Every active holder&#x27;s
session ends the way an authority change on the member does: their old token answers 401 &#x60;stale_token&#x60;, the
refresh succeeds with the new permissions and rank.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;role_system_default&#x60; (system-default roles cannot be changed by anyone)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/search',
		alias: 'getApiv1search',
		description: `Requires &#x60;platform.tenants.view&#x60; OR &#x60;platform.users.view&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
Each category needs its own permission: &#x60;persons&#x60; needs &#x60;platform.users.view&#x60;, &#x60;tenants&#x60; needs &#x60;platform.tenants.view&#x60;.
Without &#x60;include&#x60; the response carries the categories the caller is authorised for; naming a
category the caller may not see is 403 &#x60;search_category_forbidden&#x60; (the message names the category).
`,
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
			},
			{
				status: 403,
				description: `Missing both permissions (&#x60;forbidden&#x60;), or an explicitly requested category the caller lacks the permission for (&#x60;search_category_forbidden&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `The tenant selected by &#x60;X-Tenant-Id&#x60; is suspended or pending deletion, so it can be
read and its lifecycle managed but not written otherwise (&#x60;tenant_not_active&#x60;).
Routes that carry the tenant in the path (&#x60;/api/v1/tenants/{tenantId}/...&#x60;) are
exempt: the path is authoritative there, with or without the header.
`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Cannot cancel a completed task`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Reason missing`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Cannot complete a cancelled task`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Cannot reassign a terminal task`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `New assignee not active in tenant`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 403,
				description: `Forbidden. As &#x60;TenantScopeForbidden&#x60; (&#x60;forbidden&#x60;, &#x60;tenant_scope_forbidden&#x60;), plus
&#x60;tenant_scope_read_only&#x60;: the request is not a read, &#x60;X-Tenant-Id&#x60; names another
tenant, and this route is not one of the identity writes operators may perform
under scope. Writes to crm, orders, tasks, dispatch and inventory are never
accepted under a foreign &#x60;X-Tenant-Id&#x60;; call them as a member of the tenant.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Work item is in a terminal / overdue state`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
differs from the tenant in the URL (&#x60;tenant_scope_conflict&#x60;). Every platform-tenant
member (is_platform with the platform slug anchor, not an impersonation token) can
see it, whether or not they hold scope authority; every other caller has the header
ignored. The same 400 also covers an invalid list filter or cursor on routes that
take them.
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
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
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
		path: '/api/v1/tenants',
		alias: 'getApiv1tenants',
		description: `Canonical slug-lookup per ADR 0052. Returns &#x60;{tenants: [0..1 match]}&#x60;.
Enumeration-safe per ADR 0044 — callers who lack access to the matched
tenant see an empty list, indistinguishable from &quot;no such slug.&quot;

Supersedes &#x60;GET /api/v1/tenants/by-slug/{slug}&#x60; (deprecated; grandfathered
for v0.2 frontend-contract compatibility per ADR 0049).

v0.2 supports &#x60;slug&#x60; only; future filters (&#x60;status&#x60;, &#x60;created_after&#x60;)
land per Stripe listing-endpoint canon.

Requires &#x60;identity.tenants.view&#x60; (held by a tenant admin through &#x60;tenant.admin&#x60;, in the
caller&#x27;s own tenant) or &#x60;platform.tenants.view&#x60;; a caller holding neither is refused with
403 &#x60;forbidden&#x60;. The response carries the tenant&#x27;s full profile.
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
			},
			{
				status: 403,
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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

The company is created &#x60;active&#x60; (the operator&#x27;s registration is the approval; owner
ruling 2026-11-21: only an active company&#x27;s members sign in), so its first admin
signs in at once. &#x60;pending&#x60; is produced by no route today.

The first admin&#x27;s temporary password is checked against the DEFAULT password policy
(the new tenant has no stored policy yet; default: 8 characters minimum with an
upper-case letter, a lower-case letter, a digit and a symbol): &#x60;422 password_policy_violation&#x60; with
&#x60;errors.admin_password&#x60;. Nothing is created on a violation.

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;tenant_invalid (company names) / person_invalid (admin names)&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; (or &#x60;[&quot;required&quot;]&#x60; / &#x60;[&quot;too_long&quot;]&#x60; for a blank or over-long name) for &#x60;legal_name&#x60;, &#x60;display_name&#x60;, &#x60;admin_first_name&#x60;, &#x60;admin_last_name&#x60;, and nothing is written.
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
				description: `Authenticated but missing the required permission. Every authenticated operation
outside the forced-change allowlist can also answer &#x60;403&#x60; with
&#x60;error: password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;
(see the API description; no &#x60;WWW-Authenticate&#x60;, do not refresh), and an
impersonation token answers &#x60;403 impersonation_not_allowed&#x60; on the routes it may
not reach (platform plane, tenant lifecycle, search, anonymise, self-service).
`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `Email already has an active membership in another tenant`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Invalid input, nothing is written. &#x60;password_policy_violation&#x60; with
&#x60;errors.admin_password&#x60; (rule codes). &#x60;tenant_invalid&#x60; (company names) or
&#x60;person_invalid&#x60; (admin names) with &#x60;errors{&lt;field&gt;: [&lt;code&gt;]}&#x60; for &#x60;legal_name&#x60;,
&#x60;display_name&#x60;, &#x60;admin_first_name&#x60;, &#x60;admin_last_name&#x60;; the code is &#x60;required&#x60;
(blank), &#x60;too_long&#x60; (company names over 200 bytes, admin names over 100) or
&#x60;invalid_characters&#x60;. A malformed &#x60;slug&#x60; or &#x60;admin_email&#x60; is a 400
(&#x60;invalid_slug&#x60; / &#x60;invalid_email&#x60;) carrying &#x60;errors{slug: [&quot;invalid_slug&quot;]}&#x60; /
&#x60;errors{admin_email: [&quot;invalid_email&quot;]}&#x60;, not a 422. Never a 500.
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			},
			{
				status: 503,
				description: `Every password-hashing slot of this process was busy for longer than the queue
timeout (the process bounds concurrent Argon2id work, ADR 0068 D12), or the caller&#x27;s
own address already had its share of operations running and a full line of waiting
ones. A caller&#x27;s operations beyond its share WAIT their turn (within the same queue
timeout) instead of failing, so a burst from one office address is served; only the
wait that runs out, or the line that is full, answers this. Nothing was done and
nothing was counted; retry after &#x60;Retry-After&#x60; seconds. Every login branch (real
account, unknown email, locked account) answers this the same way.
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tenants/:tenantId/activate',
		alias: 'postApiv1tenantsTenantIdactivate',
		description: `A company registered through &#x60;POST /api/v1/tenants&#x60; is created &#x60;active&#x60;, so activating
it answers 204 and changes nothing (no event, &#x60;activated_at&#x60; is kept): idempotent, not
an error. Activating a company in &#x60;pending_deletion&#x60; is 422 &#x60;tenant_invalid&#x60; (restore it instead) and a
deleted one is 422 &#x60;tenant_invalid&#x60;.
Requires &#x60;identity.tenants.activate&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/tenants/:tenantId/admin-contact',
		alias: 'patchApiv1tenantsTenantIdadminContact',
		description: `A malformed phone or postal address is 422 &#x60;validation_failed&#x60; with an &#x60;errors&#x60;
entry: &#x60;phone: [&quot;invalid_phone&quot;]&#x60;, or one entry per refused part of the address under
&#x60;address.street&#x60;, &#x60;address.city&#x60;, &#x60;address.district&#x60;, &#x60;address.state&#x60;, &#x60;address.state_code&#x60; or
&#x60;address.pincode&#x60;, whose value is &#x60;required&#x60; (blank), &#x60;too_long&#x60; (over its limit),
&#x60;invalid_pincode&#x60; (not 6 digits with a leading 1-9) or, for &#x60;address.city&#x60; only, &#x60;invalid_city&#x60;.
Each value is a stable code, never a sentence.
Requires &#x60;identity.tenants.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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

Requires &#x60;identity.tenants.delete&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;tenant_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/tenants/:tenantId/profile',
		alias: 'patchApiv1tenantsTenantIdprofile',
		description: `Requires &#x60;identity.tenants.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;tenant_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;legal_name&#x60;, &#x60;display_name&#x60;, and nothing is written. A full-replace body that re-sends a stored value UNCHANGED is accepted (a value stored before the rule existed never blocks an untouched save); only a changed value is checked.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tenants/:tenantId/restore',
		alias: 'postApiv1tenantsTenantIdrestore',
		description: `Requires &#x60;identity.tenants.delete&#x60; (there is no dedicated restore permission) held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.
`,
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/tenants/:tenantId/settings',
		alias: 'patchApiv1tenantsTenantIdsettings',
		description: `A company that has not set a policy reports the default policy on every read, so the body a client read back is always accepted (full replace).

Requires &#x60;identity.tenants.update_settings&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
A malformed GST, PAN or drug-licence number is 422 &#x60;validation_failed&#x60; with an
&#x60;errors&#x60; entry under &#x60;gst_number&#x60; (&#x60;[&quot;invalid_gstin&quot;]&#x60;), &#x60;pan_number&#x60; (&#x60;[&quot;invalid_pan&quot;]&#x60;) or
&#x60;drug_licence_number&#x60; (&#x60;[&quot;invalid_drug_licence&quot;]&#x60;). Each value is a stable code, never a sentence.
When both a GSTIN and a PAN are sent, the PAN must be the one embedded in the GSTIN
(characters 3 to 12); otherwise the answer is 422 &#x60;tenant_invalid&#x60; with
&#x60;errors{pan_number: [&quot;gstin_pan_mismatch&quot;]}&#x60;, nothing is written and the message echoes
neither number. A GSTIN alone or a PAN alone is never a mismatch.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/tenants/:tenantId/suspend',
		alias: 'postApiv1tenantsTenantIdsuspend',
		description: `Reason is mandatory per data-retention.md audit canon.

Requires &#x60;identity.tenants.suspend&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;tenant_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/users',
		alias: 'getApiv1users',
		description: `Requires &#x60;identity.users.view&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).

&#x60;?status&#x3D;active|inactive|all&#x60; (default &#x60;active&#x60;, so existing callers are unchanged) picks the listing; anything else is 400 &#x60;invalid_status_filter&#x60;. A deactivated member is listed with &#x60;?status&#x3D;inactive&#x60; and can be reactivated from there. The FIRST page (no &#x60;cursor&#x60;) also carries &#x60;status_counts&#x60; (&#x60;active&#x60; and &#x60;inactive&#x60;, the whole tenant whatever &#x60;status&#x60; is) for the status chips; later pages omit it.
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
			},
			{
				name: 'status',
				type: 'Query',
				schema: z.enum(['active', 'inactive', 'all']).optional().default('active')
			}
		],
		response: ListUsersResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users',
		alias: 'postApiv1users',
		description: `Requires &#x60;identity.users.create&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).

**Who may add users (owner ruling 2026-11-21):** a super user, a platform operator holding
&#x60;platform.users.create&#x60; or &#x60;platform.users.manage&#x60; (through &#x60;X-Tenant-Id&#x60; or an impersonation
session), and, inside a company, ONLY the Company Owner and the Administrator tier (rank 0 to 10).
Everyone below that tier is refused, even a member who still holds &#x60;identity.users.create&#x60; from
before the ruling: the route answers &#x60;403 forbidden&#x60; (the permission is not in the caller&#x27;s
&#x60;effective_permissions&#x60;), and the command, deciding on the caller&#x27;s stored roles under the tenant
lock, answers &#x60;403 admin_tier_required&#x60; for a stale token. A refused caller learns nothing about the
email (no &#x60;email_has_active_membership&#x60;).

The temporary password is checked against the password policy of the TARGET tenant
(the effective tenant: the caller&#x27;s own, or the one an operator acts in through
&#x60;X-Tenant-Id&#x60;): &#x60;422 password_policy_violation&#x60; with &#x60;errors.password&#x60;. Nothing is
created on a violation.

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;user_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;first_name&#x60;, &#x60;last_name&#x60;, and nothing is written.
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
				status: 400,
				description: `&#x60;invalid_body&#x60; — the body is not valid JSON; &#x60;invalid_email&#x60; — the email is not a valid address (with &#x60;errors{email: [&quot;invalid_email&quot;]}&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `&#x60;forbidden&#x60; (the caller lacks &#x60;identity.users.create&#x60;, including every member below the Administrator tier), &#x60;admin_tier_required&#x60; (the caller&#x27;s stored rank is below the Administrator tier), or &#x60;tenant_scope_forbidden&#x60; (see TenantScopeForbidden)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `&#x60;email_has_active_membership&#x60; — the email already has an active membership in another tenant`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;password_policy_violation&#x60; — the password fails the target tenant&#x27;s policy (field &#x60;errors.password&#x60;, see PasswordPolicyViolation); &#x60;user_invalid&#x60; — the new membership violates a domain invariant (see &#x60;message&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			},
			{
				status: 503,
				description: `Every password-hashing slot of this process was busy for longer than the queue
timeout (the process bounds concurrent Argon2id work, ADR 0068 D12), or the caller&#x27;s
own address already had its share of operations running and a full line of waiting
ones. A caller&#x27;s operations beyond its share WAIT their turn (within the same queue
timeout) instead of failing, so a burst from one office address is served; only the
wait that runs out, or the line that is full, answers this. Nothing was done and
nothing was counted; retry after &#x60;Retry-After&#x60; seconds. Every login branch (real
account, unknown email, locked account) answers this the same way.
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/users/:userId',
		alias: 'getApiv1usersUserId',
		description: `Requires &#x60;identity.users.view&#x60; or self (path id equals the caller&#x27;s membership) (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).

&#x60;permission_overrides&#x60; (live grants with their expiry, and revoked names) is returned ONLY to a caller who holds &#x60;identity.users.update_permissions&#x60; AND may act on this member (strictly outranks them; owners on owners; super users and exempt platform operators); for every other caller the field is absent (never an error). It is what &#x60;PATCH .../permission-overrides&#x60; replaces, so a form seeds from it and re-sends what it does not mean to remove.

&#x60;overrides_version&#x60; is returned with &#x60;permission_overrides&#x60; (and is absent whenever that field is): an opaque token for exactly the live overrides in this response. It changes whenever the live set does, including at the instant a time-bound grant expires. &#x60;PATCH .../permission-overrides&#x60; requires it.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `Resource not found (per ADR 0044, enumeration-safe — may also mean &quot;exists but no access&quot;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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

Requires &#x60;identity.users.anonymise&#x60; held by a platform-tenant operator; platform-tenant membership alone is refused with 403 &#x60;forbidden&#x60;.

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;person_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;last_owner_protected&#x60; — the person is the only active owner of a tenant; nothing was changed. &#x60;person_memberships_changing&#x60; — the person&#x27;s memberships kept changing while the change was checked (a reactivation raced it); nothing was changed, retry`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users/:userId/deactivate',
		alias: 'postApiv1usersUserIddeactivate',
		description: `Requires &#x60;identity.users.deactivate&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). The caller must strictly outrank the target member (&#x60;insufficient_rank&#x60;; owners may act on owners; super users and exempt platform operators are exempt), decided inside the transaction that holds the tenant&#x27;s authority lock (ADR 0069).

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;user_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;reason&#x60;, and nothing is written.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;last_owner_protected&#x60; — the change would leave the tenant without an active owner; &#x60;member_roles_inconsistent&#x60; — the member&#x27;s assigned roles cannot be loaded as this tenant&#x27;s roles, so its rank cannot be decided; nothing was changed (an assignment row written outside the commands, e.g. an operator repair or a restored backup, pointing at a role of another tenant)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
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
Requires &#x60;identity.users.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). The caller must strictly outrank the target member (&#x60;insufficient_rank&#x60;; owners may act on owners; super users and exempt platform operators are exempt), decided inside the transaction that holds the tenant&#x27;s authority lock (ADR 0069).
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;member_roles_inconsistent&#x60; — the member&#x27;s assigned roles cannot be loaded as this tenant&#x27;s roles, so its rank cannot be decided; nothing was changed (an assignment row written outside the commands, e.g. an operator repair or a restored backup, pointing at a role of another tenant)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `&#x60;manager_not_eligible&#x60; — the manager is not an active member of this tenant more senior than the member, or the link would close a reporting cycle; otherwise validation (&#x60;user_invalid&#x60;)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/users/:userId/manager',
		alias: 'deleteApiv1usersUserIdmanager',
		description: `Requires &#x60;identity.users.update&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). The caller must strictly outrank the target member (&#x60;insufficient_rank&#x60;; owners may act on owners; super users and exempt platform operators are exempt), decided inside the transaction that holds the tenant&#x27;s authority lock (ADR 0069).
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;member_roles_inconsistent&#x60; — the member&#x27;s assigned roles cannot be loaded as this tenant&#x27;s roles, so its rank cannot be decided; nothing was changed (an assignment row written outside the commands, e.g. an operator repair or a restored backup, pointing at a role of another tenant)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/users/:userId/permission-overrides',
		alias: 'patchApiv1usersUserIdpermissionOverrides',
		description: `Both arrays are required; empty arrays clear the corresponding overlay. This REPLACES the whole set: read the current one first from &#x60;GET /users/{userId}&#x60; (&#x60;permission_overrides&#x60;) and re-send what must stay. A name that is already a live grant and is re-sent keeps its existing expiry (a time-bound grant from an approved permission request stays time-bound and cannot be extended by re-sending it); every other granted name is permanent.

**Precondition.** &#x60;overrides_version&#x60; is required: send the value &#x60;GET /users/{userId}&#x60; returned with the overrides the form was opened on. The save is applied only while the member&#x27;s live overrides still have that version, decided inside the transaction that holds the tenant&#x27;s authority lock. When they do not (a time-bound grant has expired since, a permission request was approved, another admin saved, or this same form was already saved once) the answer is &#x60;409 overrides_changed&#x60; and NOTHING is written: read the user again and repeat the change on what is there now. Without it a re-sent name whose time-bound grant had expired would become a permanent grant, and a grant approved after the form opened would be erased. A caller who may not act on the member is refused by rank (&#x60;403&#x60;) whatever version is sent. A missing, &#x60;null&#x60; or blank &#x60;overrides_version&#x60; is &#x60;400 invalid_body&#x60; with &#x60;errors.overrides_version: [&quot;required&quot;]&#x60;. A retry of the SAME request with the same &#x60;X-Command-Id&#x60; is answered from the stored reply, not re-decided.

Permission names
MUST match the closed &#x60;permission.IdentityPermissions&#x60; catalogue;
unknown names surface as 422 (&#x60;permission_unknown&#x60;). A name listed twice in one array is stored once; a name present in BOTH arrays is a 422 &#x60;validation_failed&#x60; with &#x60;errors{revoked: [&quot;also_granted&quot;]}&#x60; (compare your own two arrays to find the names).
Requires &#x60;identity.users.update_permissions&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). The caller must strictly outrank the target member (&#x60;insufficient_rank&#x60;; owners may act on owners; super users and exempt platform operators are exempt), decided inside the transaction that holds the tenant&#x27;s authority lock (ADR 0069). Conferring a permission the caller does not hold is rejected with &#x60;grant_exceeds_authority&#x60;.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;overrides_changed&#x60; — the member&#x27;s live overrides are no longer the ones &#x60;overrides_version&#x60; names (a time-bound grant expired, a request was approved, or someone else saved after the form was opened); nothing was changed, read the user again; &#x60;owner_protected&#x60; — tenant.admin cannot be revoked from an owner; &#x60;member_roles_inconsistent&#x60; — the member&#x27;s assigned roles cannot be loaded as this tenant&#x27;s roles, so its rank cannot be decided; nothing was changed (an assignment row written outside the commands, e.g. an operator repair or a restored backup, pointing at a role of another tenant)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'patch',
		path: '/api/v1/users/:userId/profile',
		alias: 'patchApiv1usersUserIdprofile',
		description: `Requires &#x60;identity.users.update&#x60; or self (path id equals the caller&#x27;s membership) (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068).  Editing ANOTHER member&#x27;s profile is also an authority decision: the caller must strictly outrank the member (&#x60;insufficient_rank&#x60;; owners may act on owners; super users and exempt platform operators are exempt), decided under the tenant&#x27;s authority lock (ADR 0069); editing one&#x27;s own profile is unchanged.

Text a person types that other people read is refused when it holds control characters (including CR, LF and TAB), Unicode direction overrides, or invisible or line-breaking characters (zero-width space, soft hyphen, word joiner and invisible operators, Hangul fillers, line and paragraph separators, annotation, object-replacement and tag characters, BOM; a zero-width joiner or non-joiner is accepted only INSIDE a word, between two letters or marks): 422 &#x60;user_invalid&#x60; with &#x60;errors{&lt;field&gt;: [&quot;invalid_characters&quot;]}&#x60; for &#x60;designation&#x60;, &#x60;department&#x60;, &#x60;status_message&#x60;, and nothing is written. A full-replace body that re-sends a stored value UNCHANGED is accepted (a value stored before the rule existed never blocks an untouched save); only a changed value is checked.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `Conflict with the current state of the resource (see the &#x60;error&#x60; code)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users/:userId/reactivate',
		alias: 'postApiv1usersUserIdreactivate',
		description: `Requires &#x60;identity.users.reactivate&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). The caller must strictly outrank the target member (&#x60;insufficient_rank&#x60;; owners may act on owners; super users and exempt platform operators are exempt), decided inside the transaction that holds the tenant&#x27;s authority lock (ADR 0069). Reactivating an OWNER from outside the tenant (a platform operator under &#x60;X-Tenant-Id&#x60;) needs &#x60;platform.tenants.ownership&#x60; (&#x60;ownership_authority_required&#x60;), like deactivating one.
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;person_active_elsewhere&#x60; — the person already has an active membership in another company (a person is active in at most one); nothing was changed; &#x60;member_roles_inconsistent&#x60; — the member&#x27;s assigned roles cannot be loaded as this tenant&#x27;s roles, so its rank cannot be decided; nothing was changed`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'post',
		path: '/api/v1/users/:userId/roles',
		alias: 'postApiv1usersUserIdroles',
		description: `Requires &#x60;identity.roles.assign&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). The caller must strictly outrank the target member (&#x60;insufficient_rank&#x60;; owners may act on owners; super users and exempt platform operators are exempt), decided inside the transaction that holds the tenant&#x27;s authority lock (ADR 0069). Conferring a permission the caller does not hold is rejected with &#x60;grant_exceeds_authority&#x60;. Only a super user may assign a super-admin role. The role&#x27;s level must be below the caller&#x27;s rank (owners: any tenant role). A deleted or unknown role is &#x60;role_not_found&#x60;.
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
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 404,
				description: `&#x60;role_not_found&#x60; — no live role with that id in the target tenant (or the user does not exist)`,
				schema: ErrorResponse
			},
			{
				status: 409,
				description: `&#x60;member_roles_inconsistent&#x60; — the member&#x27;s assigned roles cannot be loaded as this tenant&#x27;s roles, so its rank cannot be decided; nothing was changed (an assignment row written outside the commands, e.g. an operator repair or a restored backup, pointing at a role of another tenant)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'delete',
		path: '/api/v1/users/:userId/roles/:roleId',
		alias: 'deleteApiv1usersUserIdrolesRoleId',
		description: `Requires &#x60;identity.roles.revoke&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068). Self-target forbidden (&#x60;self_modification_forbidden&#x60;). The caller must strictly outrank the target member (&#x60;insufficient_rank&#x60;; owners may act on owners; super users and exempt platform operators are exempt), decided inside the transaction that holds the tenant&#x27;s authority lock (ADR 0069).
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
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is one of: &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in
the effective tenant, or is not a valid actor), &#x60;tenant_scope_forbidden&#x60; (see
TenantScopeForbidden), &#x60;self_modification_forbidden&#x60; (the caller targeted themself),
&#x60;insufficient_rank&#x60; (the caller does not strictly outrank the target member or role,
ADR 0069), &#x60;grant_exceeds_authority&#x60; (the change confers or removes a permission the
caller does not hold, or &#x60;tenant.admin&#x60; as a non-owner), &#x60;admin_tier_required&#x60; (the change would give
&#x60;identity.users.create&#x60; to a role or a member below the Administrator tier: a role below the tier cannot
contain it, it cannot be an override of a member below the tier, and it cannot be requested or approved
below the tier; owner ruling 2026-11-21), &#x60;ownership_authority_required&#x60;
(a platform operator acting under &#x60;X-Tenant-Id&#x60; tried to change who OWNS the tenant:
assign or revoke Company Owner, confer or remove &#x60;tenant.admin&#x60; by role or override, or
deactivate or reactivate an owner, without &#x60;platform.tenants.ownership&#x60;; super users are unaffected).
Editing a role acts on its active holders (&#x60;insufficient_rank&#x60;, &#x60;self_modification_forbidden&#x60;); lifting a
member&#x27;s explicit revoke (an overrides change, or approving a request for a revoked name) needs the Admin
tier or above (&#x60;grant_exceeds_authority&#x60;).
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
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
				description: `&#x60;last_owner_protected&#x60; — the change would leave the tenant without an active owner; &#x60;member_roles_inconsistent&#x60; — the member&#x27;s assigned roles cannot be loaded as this tenant&#x27;s roles, so its rank cannot be decided; nothing was changed (an assignment row written outside the commands, e.g. an operator repair or a restored backup, pointing at a role of another tenant)`,
				schema: ErrorResponse
			},
			{
				status: 422,
				description: `Validation failure (RFC 9457 with field-level errors map)`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	},
	{
		method: 'get',
		path: '/api/v1/users/search',
		alias: 'getApiv1userssearch',
		description: `The picker behind lead reassignment. Requires &#x60;crm.leads.assign&#x60; (satisfied by &#x60;tenant.admin&#x60; in the caller&#x27;s own tenant, or by &#x60;platform.*&#x60; equivalents for platform operators; ADR 0068), and searches the caller&#x27;s effective tenant only.

Returns ACTIVE members whose display name (first name, a space, last name) contains &#x60;q&#x60;, case-insensitively, best first (by name), at most &#x60;limit&#x60;. A hit carries &#x60;membership_id&#x60;, &#x60;display_name&#x60; and &#x60;designation&#x60; only: no email, no phone, no person id. A deactivated, anonymised or globally suspended person is never offered. &#x60;q&#x60; is trimmed and measured in characters: under 2 is 400 &#x60;search_query_too_short&#x60;, over 100 is 400 &#x60;search_query_too_long&#x60;. An empty match is 200 with &#x60;members: []&#x60;, which a client shows as &quot;no match&quot; and keeps apart from a failed call.
`,
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
				schema: z.number().int().gte(1).lte(20).optional().default(10)
			},
			{
				name: 'X-Tenant-Id',
				type: 'Header',
				schema: z.string().uuid().optional()
			}
		],
		response: SearchMembersResponse,
		errors: [
			{
				status: 400,
				description: `Malformed request (invalid body, bad param shape)`,
				schema: ErrorResponse
			},
			{
				status: 403,
				description: `Forbidden. &#x60;error&#x60; is &#x60;forbidden&#x60; (the caller lacks the route&#x27;s permission in the
effective tenant) or &#x60;tenant_scope_forbidden&#x60; (&#x60;X-Tenant-Id&#x60; names another tenant
and the caller is neither a super user nor a platform operator holding
&#x60;platform.tenants.view&#x60;). On path-tenant routes (&#x60;/api/v1/tenants/{tenantId}/...&#x60;,
the lifecycle routes) a header equal to the path tenant is not a scope request, so
&#x60;tenant_scope_forbidden&#x60; is never returned there: the route&#x27;s own permission
decides, with &#x60;forbidden&#x60;. &#x60;tenant_scope_forbidden&#x60; is decided before any tenant
lookup and is identical for existing, unknown and suspended tenants, so it cannot
be used to probe which tenants exist.
(Like every authenticated operation, also &#x60;403 password_change_required&#x60; while the token carries &#x60;must_change_password&#x60;.)
`,
				schema: ErrorResponse
			},
			{
				status: 429,
				description: `Rate limit exceeded; &#x60;Retry-After&#x60; carries the whole seconds to wait (rounded up).
EVERY operation can answer this: a global per-client limiter (10 requests/s, burst 60)
runs in front of the whole API, and its key map is capped (a new client is refused while
the cap is full). The bucket is the client address (the end client the BFF forwards in
&#x60;X-Forwarded-For&#x60;, never the BFF; IPv6 clients share a bucket per /64). Login, refresh,
request-password-reset, reset-password, confirm-email-change and tenant registration also
carry their own tighter per-client limit. change-password is limited per PERSON (5 per
minute, burst 5, whichever address the requests come from).
`,
				schema: ErrorResponse
			}
		]
	}
];
