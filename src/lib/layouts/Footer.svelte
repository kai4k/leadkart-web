<script lang="ts">
	const year = new Date().getFullYear();
</script>

<!--
  Fixed glass status bar pinned to the viewport bottom — mirrors the
  topbar's positioning so the shell reads as two parallel chrome
  surfaces (top + bottom) framing the scrollable content between them.

  Position math:
    inset-block-end : max(--lk-shell-gap, --safe-bottom)    — gap + home
                                                               indicator
    inset-inline-start : --lk-topbar-inline-start           — matches
                                                               topbar
                                                               (after sidebar)
    inset-inline-end : max(--lk-shell-gap, --safe-right)    — gap + curve
    block-size      : --lk-footer-height                    — 2.5rem
                                                               status bar
  Glass material composes from .glass-statusbar (utilities.css) — one
  recipe shared with topbar/popover/dialog. No per-component duplication.
-->
<footer class="lk-footer glass-card label-small" aria-label="Application footer">
	© {year} LeadKart · Pharma SaaS
</footer>

<style>
	/* Composes .glass-card material; this block handles footer-specific
	   geometry: edge-anchored bottom strip with top-edge border only,
	   zero radius (overrides .glass-card default of 1.5rem since the
	   footer is flush to viewport bottom). */
	.lk-footer {
		position: fixed;
		inset-block-end: max(var(--lk-shell-gap), var(--safe-bottom));
		inset-inline-start: max(var(--lk-topbar-inline-start), var(--safe-left));
		inset-inline-end: max(var(--lk-shell-gap), var(--safe-right));
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		block-size: var(--lk-footer-height);
		padding-inline: clamp(0.75rem, 1.5vw, 1.25rem);
		color: var(--color-fg-muted);
		/* Override .glass-card defaults for edge-anchored chrome */
		border: 0;
		border-block-start: var(--glass-border-subtle);
		border-radius: 0;
		transition:
			inset-inline-start 0.18s ease-out,
			inset-inline-end 0.18s ease-out,
			border-radius 0.18s ease-out;
	}
	/* Semibox — footer floats; restore .glass-card full ring + radius. */
	:global(:root[data-layout='semibox']) .lk-footer {
		border: var(--glass-border);
		border-radius: var(--lk-shell-radius);
	}
</style>
