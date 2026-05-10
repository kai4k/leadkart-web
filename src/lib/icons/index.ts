/**
 * Icon registry — re-exports from lucide-svelte under canonical names
 * + an Icon wrapper that consumes the icon-size design tokens.
 *
 * Industry canon: components consume from `$lib/icons` (or `$icons`),
 * not directly from `lucide-svelte`. Keeps the icon library swappable
 * (move to phosphor / heroicons / custom set without ripping every
 * import) + lets us standardise size via the IconSize token.
 *
 * Usage:
 *   import { Icon, ChevronRight } from '$lib/icons';
 *   <Icon icon={ChevronRight} size="sm" aria-hidden="true" />
 *
 * Or, when the lucide component supports `size` directly + you want
 * inline arbitrary size, import the named icon directly + pass the
 * `iconSize('md')` helper.
 */

export { default as Icon, iconSize, type IconSize } from './Icon.svelte';

// Lucide re-exports — add icons here as features need them. Keeps the
// import surface curated; stops random Lucide icons appearing in the
// codebase without an audit.
export {
	AlertCircle,
	ArrowLeft,
	ArrowRight,
	Bell,
	Boxes,
	Building2,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Eye,
	EyeOff,
	Info,
	LayoutDashboard,
	ListTodo,
	LogOut,
	Menu,
	Moon,
	Plus,
	Search,
	Settings,
	ShieldCheck,
	ShoppingCart,
	Sun,
	Trash2,
	Truck,
	User,
	UserCheck,
	Users,
	X,
	XCircle
} from 'lucide-svelte';
