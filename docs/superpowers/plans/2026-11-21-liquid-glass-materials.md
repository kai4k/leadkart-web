# Phase 2 appendix G: Liquid Glass materials, legibility gate, typed date entry

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Where this sits.** This is appended work for `docs/superpowers/plans/2026-11-20-phase-2-ui-foundation.md` (the "Phase 2 plan"). Run it after Task 17 (CHECKPOINT 2) and before Task 18. Tasks 18–32 consume what it builds. The amendments to those tasks are listed in section 10. Everything in the Phase 2 plan's §0 Global Constraints applies here unchanged, except where section 9 of this file amends a constraint.

**Written against** `feat/ui-foundation` at `886a7922` (2026-11-21). Tasks 15 (ThemeCustomizer) and 16 (legacy alias deletion and gates) were in progress at that commit. Step 0 of G1 re-checks the tree after they land.

**Goal.** Follow the owner's decision of 2026-11-21: "follow the Apple IOS 27 (dark contrast style text and proper liquid glass like background and foreground with transluciency)". The navigation and control layer becomes translucent, blurred material. Text stays solid and maximum-contrast. Legibility is proven by the contrast gate over the worst backdrop each layer can have. It is never obtained by darkening the palettes. Every transparency level has an opaque fallback. A second, small task restores typed date entry next to the calendar popover.

**How the owner's phrase is read.**

- "Dark contrast style text": text is opaque. It is near-black on light glass and near-white on dark glass, and it is never tinted or faded.
- "Liquid glass like background": the chrome and overlay surfaces are blurred, saturated, luminosity-compressed translucent fills.
- "Foreground with translucency": the controls that sit on glass (hover chips, the search field, selected rows in menus) are translucent fills on the material, as Apple does it. The labels on those controls stay solid.

---

## iOS 27: verified against Apple's published guidance (2026-11-21)

iOS 27 shipped on 2026-09-14 (Apple Newsroom). This section re-checks the plan against Apple's own sources as of 2026-11-21. Where it differs from section 0, **this section wins**. Plan items it changed are marked "(amended 2026-11-21)".

### Confirmed by Apple (primary sources)

| #   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Source (date)                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | "a new slider in Settings gives users the option to personalize Liquid Glass … adjusting it anywhere from ultraclear to fully tinted to match their preference."                                                                                                                                                                                                                                                                                                                | Apple Newsroom, "Major updates for Apple's software platforms are now available", https://www.apple.com/newsroom/2026/09/major-updates-for-apples-software-platforms-are-now-available/ (2026-09-14)                                                            |
| A2  | "Updates to Liquid Glass ensure exceptional readability with more uniform refraction and improved contrast." "A new slider lets you easily customize how Liquid Glass looks, from ultra-clear to fully tinted."                                                                                                                                                                                                                                                                 | App Store iOS 27 story, https://apps.apple.com/us/iphone/story/id1896606813 (2026, undated)                                                                                                                                                                     |
| A3  | "Liquid Glass has a refined look and automatically responds to the new Liquid Glass slider to adjust its tint." Apps "gain this look without having to change a single line of code."                                                                                                                                                                                                                                                                                           | WWDC26 session 269 "What's new in SwiftUI", https://developer.apple.com/videos/play/wwdc2026/269/ (June 2026)                                                                                                                                                   |
| A4  | "the `.automatic` style no longer switches between the existing soft and hard styles but provides its own visuals for additional clarity. If you have overridden the style … especially when set to `.soft`, … that no longer matches the default system appearance."                                                                                                                                                                                                           | WWDC26 session 278 "Modernize your UIKit app", https://developer.apple.com/videos/play/wwdc2026/278/ (June 2026)                                                                                                                                                |
| A5  | "**Prefer the automatic scroll edge effect style.** … This style provides a more opaque visual separation for top toolbars that contain a large number of controls, text that appears outside of Liquid Glass controls, and pinned table headers." "Scroll edge effects aren't decorative." "**Apply one scroll edge effect per view.**"                                                                                                                                        | HIG Scroll views, https://developer.apple.com/design/human-interface-guidelines/scroll-views (change log: "Updated guidance for scroll edge effects", 2026-06-08)                                                                                               |
| A6  | "Instead of applying a solid or semi-opaque background color beneath controls, use a scroll edge effect to visually elevate controls above content."                                                                                                                                                                                                                                                                                                                            | HIG Layout, https://developer.apple.com/design/human-interface-guidelines/layout (updated 2026-09-09)                                                                                                                                                           |
| A7  | "Minimize its use on controls and instead use it intentionally for primary actions or status indicators … consider moving it into the content layer, where it scrolls beneath Liquid Glass controls and gets picked up dynamically." The "incorrect" example: "the brand color used in all controls".                                                                                                                                                                           | HIG Branding, https://developer.apple.com/design/human-interface-guidelines/branding (2026-09-09)                                                                                                                                                               |
| A8  | "move color into the content area of your app … Liquid Glass controls sit above the content layer and pick up your brand color dynamically"; Slack "moved their solid top toolbar color into the content area". A sheet "with a Liquid Glass backing … and the sheet has concentric edges to match the hardware".                                                                                                                                                               | WWDC26 session 251 "Communicate your brand identity on iOS", https://developer.apple.com/videos/play/wwdc2026/251/ (June 2026)                                                                                                                                  |
| A9  | "By default, sidebar icons use your app's accent color." Sidebars "can float above content in the Liquid Glass layer."                                                                                                                                                                                                                                                                                                                                                          | HIG Sidebars, https://developer.apple.com/design/human-interface-guidelines/sidebars (2026-06-08)                                                                                                                                                               |
| A10 | "**Use menu item icons sparingly and with purpose.** … provide icons for all menu items in a group, or none of them."                                                                                                                                                                                                                                                                                                                                                           | HIG Menus, https://developer.apple.com/design/human-interface-guidelines/menus (2026-06-08)                                                                                                                                                                     |
| A11 | "Reduce the use of toolbar backgrounds and tinted controls"; "Only specify one primary action, and put it on the trailing side"; "Prefer system-provided symbols without borders".                                                                                                                                                                                                                                                                                              | HIG Toolbars, https://developer.apple.com/design/human-interface-guidelines/toolbars (2025-12-16; no 2026 entry)                                                                                                                                                |
| A12 | The 2025 core is unchanged: the control layer vs the content layer, no glass on glass, regular vs clear, the 35% dimming layer, and the Reduce Transparency / Increase Contrast / Reduce Motion behaviour. The Materials change log still ends at 2025-09-09. Its only settings sentence: the variants differ "if people choose a preferred look for Liquid Glass in their device's settings, or turn on accessibility settings that reduce transparency or increase contrast". | HIG Materials, https://developer.apple.com/design/human-interface-guidelines/materials                                                                                                                                                                          |
| A13 | API: SwiftUI `Glass` has `regular`, `clear`, `identity`, `tint(_:)` and `interactive(_:)`, all iOS 26.0. No iOS 27 member, and no API exposing the slider value.                                                                                                                                                                                                                                                                                                                | https://developer.apple.com/documentation/swiftui/glass                                                                                                                                                                                                         |
| A14 | Safari 27.0: "Fixed an extremely slow page load on iPhone caused by blur filters with large radii". No `backdrop-filter`, `prefers-reduced-transparency` or `prefers-contrast` additions.                                                                                                                                                                                                                                                                                       | Safari 27 release notes, https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes (2026-09-14)                                                                                                                                    |
| A15 | Safari 27.3 **beta**: "Added Adaptive Dark Mode, which automatically adapts bright web pages that don't natively support dark mode"; "Added support for opting out of Adaptive Dark Mode when `color-scheme: only light` is specified"; accelerated animations now include `backdrop-filter`. WebKit adds that pages declaring `color-scheme: light dark` are left unchanged.                                                                                                   | Safari 27.3 beta release notes, https://developer.apple.com/documentation/safari-release-notes/safari-27_3-release-notes (2026-11-16); WebKit blog "Introducing Adaptive Dark Mode", https://webkit.org/blog/18541/introducing-adaptive-dark-mode/ (2026-11-03) |

### What changes in this plan

| Finding                                                                                                                                                                                                                                                 | Plan change (amended 2026-11-21)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A4–A6: the iOS 27 scroll edge effect is automatic and uniform, more opaque for bars with many controls or with text, and for pinned headers. It is not decorative, and there is one per view. Layout prefers it to "a solid or semi-opaque background". | The bar material is reinterpreted as **the web form of Apple's automatic scroll edge effect**: a uniform blurred band with a defined bottom edge, which is what the press called the "uniform toolbar". The decorative soft `::after` fade and `--material-edge-fade` are **deleted** (2.2, 2.3, 6.4, 7, G2, G6). In `layout=horizontal` the topbar and the horizontal nav form **one** effect: the topbar drops its bottom edge, and the nav carries it (7, G6). Sticky table headers keep the opaque hard edge (A5 "pinned table headers"). |
| A7, A8, A11: brand colour goes into the content layer; tint only primary actions, status and selection; reduce toolbar backgrounds.                                                                                                                     | Principle 4 now cites A7. GD8 (the pattern band is opaque, never glass) stands. Q5 widens: the `pattern` band and the `brand`/`purple` sidebar colours are brand colour across a whole control, Apple's "incorrect" case. They stay selectable (owner decision, earlier), are never the default, and the owner is asked whether to keep them.                                                                                                                                                                                                 |
| A9: sidebar icons use the accent colour.                                                                                                                                                                                                                | On the `light` sidebar, nav icons use `--primary-indicator`, a new gate mark at 3:1 over the sidebar composite. Coloured sidebars keep `sidebar-foreground` icons (3.2, 7, G1, G3, G6).                                                                                                                                                                                                                                                                                                                                                       |
| A10: menu icons are all-or-none per group.                                                                                                                                                                                                              | A new rule in section 7 for UserMenu, RowActionsMenu, the DataTable column menu and the CommandPalette groups, enforced by review and by a component test in G5. Task 25 amendment.                                                                                                                                                                                                                                                                                                                                                           |
| A1–A3: the system slider runs from ultraclear to fully tinted.                                                                                                                                                                                          | The customizer labels use Apple's words: **Glass** (default) · **Tinted** (stored value `reduced`, fills 92–95%) · **Solid** (`off`). The stored values are unchanged. There is no "ultraclear" step: below the gate's alphas, text fails (3.3). Sections 4 and 8 and G4 are amended.                                                                                                                                                                                                                                                         |
| A3, A13, A14, A15: no web-visible signal for the slider.                                                                                                                                                                                                | Pages cannot follow the iPhone's slider: there is no media feature and no API. Safari 27.0–27.2 also does not support `prefers-reduced-transparency` (caniuse). The customizer is the only control, and its hint says so (G4).                                                                                                                                                                                                                                                                                                                |
| A15: Adaptive Dark Mode (Safari 27.3 beta).                                                                                                                                                                                                             | An iPhone user in dark appearance who chose LeadKart's light mode could have the gated light theme re-coloured by Safari. `semantic.css` declares `color-scheme: only light` for the light and black-white modes (`:root` default, `[data-mode='light']`, `[data-mode='black-white']`). `auto` keeps `light dark` and `dark` keeps `dark`. This is a new G9 step (amended): first verify that Lightning CSS still lowers `light-dark()` with `only light`. A risk row is added.                                                               |
| A14: large blur radii were slow on iPhone before Safari 27.0.                                                                                                                                                                                           | `--material-pane-blur` goes from 28px to **24px**, because iOS 26 devices are still in use (2.2, 2.3). The bar stays at 16px.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| iOS 27 navigation bars minimise on scroll (`toolbarMinimizationBehavior`, `UINavigationItem.navigationBarMinimization`; iOS & iPadOS 27 release notes, https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes). | **Not adopted** in G: it needs a scroll listener and changes layout. It is noted in section 11 as a later candidate for the phone layout.                                                                                                                                                                                                                                                                                                                                                                                                     |
| A2: "more uniform refraction".                                                                                                                                                                                                                          | This confirms that no lensing or refraction is needed for legibility. GD2 stands.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Still unverified (no Apple primary source found)

- **"A darkened edge around Liquid Glass elements" and "brighter specular highlights".** These are press only (MacRumors, 2026-06-10, attributed to Apple). No HIG page, session, Newsroom or App Store text found states them. The `--material-edge` and `--material-highlight` tokens stay as decorative plan choices; the owner's screenshots decide (section 11).
- **Numbers.** No numeric material values (alpha, blur) and no positions or default for the slider. 9to5Mac's "the midpoint is the default" is not confirmed by Apple.
- **Media features on iOS.** Whether iOS 27 Safari maps Reduce Transparency or Increase Contrast to `prefers-reduced-transparency` / `prefers-contrast` is not stated in the release notes. caniuse lists `prefers-reduced-transparency` as unsupported on iOS 27.0–27.2. This is a G12 device check.
- **No WWDC26 session dedicated to Liquid Glass** was found. The catalogue (https://developer.apple.com/videos/wwdc2026/) was checked, along with sessions 250 "Principles of great design" (no Liquid Glass content), 251, 269 and 278.
- **HIG pages with no iOS 27 Liquid Glass changes:** Typography (latest entry 2025-12-16), Color (2025-12-16), Buttons (2025-12-16) and Sheets (2026-03-24, button placement only). The "What's new in iOS 27" page says only "Refreshed materials, refined typography, and updated tab and navigation bars" (https://developer.apple.com/ios/whats-new/).

**URLs checked on 2026-11-21:**

- https://developer.apple.com/design/whats-new/
- HIG (through Apple's JSON feed): materials, color, typography, layout, buttons, toolbars, sidebars, sheets, menus, scroll-views, branding, accessibility
- https://developer.apple.com/ios/whats-new/
- iOS & iPadOS 27 release notes
- Safari 27 and 27.3 beta release notes
- https://developer.apple.com/documentation/swiftui/glass
- https://developer.apple.com/videos/wwdc2026/ and sessions 250, 251, 269, 278
- Apple Newsroom (2026-09-14)
- the App Store iOS 27 story
- https://webkit.org/blog/ and the Adaptive Dark Mode post
- https://bugs.webkit.org/show_bug.cgi?id=224899 (unprefixed backdrop-filter; nothing on reduced transparency)

---

## 0. Research summary (what this plan relies on)

### 0.1 Apple's own material

**HIG › Materials** (developer.apple.com/design/human-interface-guidelines/materials, read through Apple's JSON feed; change log: Liquid Glass added 2025-06-09, updated 2025-09-09):

- "Liquid Glass forms a distinct functional layer for controls and navigation elements — like tab bars and sidebars — that floats above the content layer."
- "**Don't use Liquid Glass in the content layer.** … use standard materials for elements in the content layer, such as app backgrounds." Transient controls (sliders, toggles) are the exception, and only while they are being activated.
- "**Use Liquid Glass effects sparingly.** … Limit these effects to the most important functional elements in your app."
- Regular variant: it "blurs and adjusts the luminosity of background content to maintain legibility … Use the regular variant when … components have a significant amount of text, such as alerts, sidebars, or popovers."
- Clear variant: only "over visually rich backgrounds" (photos, video), and with "a dark dimming layer of 35% opacity" when the content is bright.
- Vibrancy: the quaternary level should be avoided on thin materials, "because the contrast is too low". "Thicker materials, which are more opaque, can provide better contrast for text and other elements with fine features."

**HIG › Color › Liquid Glass color** (updated 2025-12-16):

- "By default, Liquid Glass has no inherent color, and instead takes on colors from the content directly behind it."
- "**Apply color sparingly …** To emphasize primary actions, apply color to the background rather than to symbols or text … Refrain from adding color to the background of multiple controls."
- "Liquid Glass appears more opaque in larger elements like sidebars to preserve legibility."
- "Make sure its default or resting state — like the top of a screen of scrollable content — maintains clear legibility."

**HIG › Accessibility:** contrast minimums are WCAG AA: 4.5:1 for text up to 17 pt, and 3:1 at 18 pt or bold. Under Reduce Motion, avoid "animating into and out of blurs".

**WWDC25 "Meet Liquid Glass" (session 219):**

- Lensing; "highlights that respond to geometry".
- Shadows that are stronger over text.
- Small elements flip between light and dark; "bigger elements, like menus or sidebars … don't flip".
- Larger glass "casts deeper, richer shadows".
- "Always avoid glass on glass." On top of glass, use "fills, transparency, and vibrancy".
- Scroll edge effect: content "dissolves into the background" under bars. A "hard style" is used when there are pinned accessory views such as column headers.
- "Tinting should only be used to bring emphasis to primary elements and actions."
- Accessibility: "Reduced Transparency makes Liquid Glass frostier and obscures more of the content behind it. Increased contrast makes elements predominantly black or white and highlights them with a contrasting border, and Reduced Motion decreases the intensity of some effects and disables any elastic properties."

**iOS 27 (WWDC 2026).** Apple's HIG pages as fetched show no iOS 27 change-log entry; see section 12. Press coverage:

- MacRumors, 2026-06-10, attributed to Apple: Liquid Glass "more effectively diffuses complex content", with "a darkened edge around Liquid Glass elements" and "brighter specular highlights".
- MacRumors also reports a "uniform toolbar" under scrolled content.
- 9to5Mac, 2026-06-12 and 2026-06-15: a Settings › Appearance slider runs from strong glass to "essentially completely opaque". Its midpoint is the default, and it replaces the Clear/Tinted toggle.

This plan takes three things from iOS 27: the darkened edge, the brighter top highlight, and a user-facing transparency level. (amended 2026-11-21) Apple has now confirmed the slider and the scroll-edge change (A1–A6 above). The darkened edge and the brighter highlight remain press-only.

### 0.2 The web, today

- **`backdrop-filter`.** Supported by every browser in the Tailwind 4 floor (Safari 16.4+ with `-webkit-`, Chrome 111+, Firefox 128+).
  - Filter Effects 2 §2: a value other than `none` creates a **stacking context and a containing block for absolute and fixed descendants**. The root element is the exception.
  - The effect is visible only where the element is semi-transparent.
  - `blur()` uses edge mode "mirror".
  - A **Backdrop Root** is formed by an ancestor with a filter, opacity < 1, a mask, a clip-path, a backdrop-filter or a blend mode. A material inside such an ancestor sees only that ancestor's content.
- **SVG refraction** (`backdrop-filter: url(#f)` with `feDisplacementMap`, the "GlassSurface" technique). Chromium only. Firefox bug 1808785 is open, and WebKit bug 245510's shipping status could not be confirmed. Aave's production write-up ("Building Glass for the Web") avoided `backdrop-filter: url()` altogether and filters live DOM with per-shape displacement maps, plus a WebGL path. That shows how much engineering real refraction costs.
- **Media queries.**
  - `prefers-reduced-transparency`: Chrome and Edge 118+, Samsung Internet 25+. Not supported by Safari, including iOS 27.x, or Firefox (caniuse). So iOS "Reduce Transparency" does NOT reach web pages.
  - `prefers-contrast: more` and `forced-colors: active` are widely supported.
  - CSS Color Adjust 1, forced colours: background "alpha channel is taken from the original background-color value", so translucent fills stay translucent; "box-shadow and text-shadow compute to none".
- **Performance on Android.** No published Chrome numbers. Firefox bugs 1732817, 1828248 and 1891831 show the cost mechanisms on Mali and Adreno GPUs: blur needs several intermediate render targets, and large framebuffer copies to and from the backdrop path are expensive. A backdrop filter can also make the browser lose the scroll root, so the whole screen is invalidated on every scroll. The lesson is to keep the count and the area of filtered layers low, never filter something that repaints every frame, and measure.

---

## 1. Principles (the one page)

1. **Two layers, as Apple draws them.**
   - The **content layer** is opaque: page canvas, cards, table bodies, form inputs, long text, StatCards, timelines and kanban.
   - The **control layer** floats above it and is glass:
     - the topbar and the horizontal nav;
     - the sidebar (desktop and the mobile sheet);
     - floating toolbars (BulkActionBar);
     - sheets, dialogs, alert dialogs, the customizer and the command palette;
     - popovers, dropdown menus, select and combobox lists, calendar popups;
     - neutral toasts;
     - the auth card (a sheet over a decorative backdrop).

   Why: HIG "Don't use Liquid Glass in the content layer"; WWDC "best reserved for the navigation layer".

2. **These stay opaque even in the control layer.**
   - **The tenant / impersonation ContextBanner.** It is a safety signal, and its contrast must not depend on what scrolls behind it.
   - **Sticky table headers.** Apple's "hard style" edge for pinned column headers.
   - **Typed (status) toasts.** Their soft status fill is the message.
   - **Tooltips.** They are inverted, tiny and transient: glass would only add cost.
   - **The `pattern` topbar band.** A fully tinted bar is the "colour on the background of multiple controls" Apple warns against, and it fails at practical alphas (section 3.5).
3. **Text is never translucent.** No alpha on any text, icon, ring or input-border colour. The `check-tokens` rule stays. On glass, text uses `--foreground` and one glass-safe secondary level, `--material-muted-foreground`. The third level (`subtle`) collapses into the secondary on glass, as Apple's "avoid quaternary on thin materials" does. Labels on glass are at least weight 500.
4. **Colour is for fills and selection, not body text.** The primary colour fills buttons, selected chips, indicators and focus rings. Link and active-nav text use `--primary-text`, a separate token whose only job is 4.5:1 (G1). Glass itself has no tint. Its colour comes from what is behind it, through `saturate()` (HIG: "no inherent color"). (amended 2026-11-21) HIG Branding (2026-09-09): brand colour belongs "into the content layer, where it scrolls beneath Liquid Glass controls and gets picked up dynamically". The body wash is that content-layer colour. The light sidebar's nav icons take the accent colour (HIG Sidebars 2026-06-08).
5. **Glass is proven, not eyeballed.** Every material × layer × token combination passes WCAG AA over the darkest AND the lightest backdrop that layer can have in this product. Images count as black and white (G3).
6. **Glass degrades to opaque, never to illegible.** The fallbacks are:
   - transparency `off`;
   - OS Reduce Transparency;
   - Increase Contrast;
   - forced colours;
   - print;
   - no `backdrop-filter` support;
   - coarse pointer (panes only).

   All of them resolve the same tokens to opaque surfaces. There is no runtime style and the CSP does not change.

7. **No glass on glass.** A popover or menu opened over an open dialog or sheet is opaque. A material never contains another material.
8. **Light mode:** dark text (`--foreground` Y = 0.006) on luminous glass. **Dark mode:** near-white text (`--dark-100`) on smoky glass. The edge is darkened and the top highlight is brighter (iOS 27).

---

## 2. Material tokens

### 2.1 The set: two recipes and three utilities

| Utility            | Recipe | Used by                                                                                                                                              | Why it exists                                                                                                                                                                                                                                                                     |
| ------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `material-bar`     | bar    | Topbar, HorizontalNav, BulkActionBar                                                                                                                 | Thin glass over **moving** content. A short height means a small blurred area per frame. It carries only short labels and icons, so it can be the most translucent.                                                                                                               |
| `material-pane`    | pane   | Dialog, Sheet, AlertDialog, ThemeCustomizer, Command dialog, Popover, DropdownMenu, Select, Combobox list, calendar popups, neutral toast, auth card | Apple's "regular" variant for text-heavy components (alerts, popovers, sidebars). Larger elements are "more opaque". The backdrop is static while it is open (scroll lock, or a menu over a resting page).                                                                        |
| `material-sidebar` | pane   | Sidebar inner (desktop) and the mobile nav sheet                                                                                                     | The pane recipe with the **sidebar colour** as its fill, so the five sidebar colours (light, dark, brand, purple, sky) become five tinted glasses. A separate fill token is needed because a fill re-declared on a child element would not re-resolve `light-dark()` per element. |

Not materials: `bg-scrim` (a dim layer behind modals, no blur), the opaque "hard edge", and `material-*` with `data-transparency='off'`.

### 2.2 Exact values (default palette; every other palette inherits the same rule)

The material fills are **neutral** surfaces at a fixed alpha: `--card` / `--popover` / `--sidebar` at N%. So every palette, dark palette and sidebar colour derives its material from tokens that already exist, and the gate checks each combination. The alphas, blur, saturate and contrast are constant across palettes. Only the gate may lower or raise them, and only by changing this one file.

| Token                         | Light                                                                                                  | Dark                                                        | Notes                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--material-bar-fill`         | `--card` 72%                                                                                           | `--card` 80%                                                | alpha chosen in 3.3                                                                                                                                |
| `--material-bar-blur`         | `16px`                                                                                                 | same                                                        | coarse pointer: `12px`                                                                                                                             |
| `--material-bar-saturate`     | `1.8`                                                                                                  | same                                                        | pulls colour from the backdrop (the "tint")                                                                                                        |
| `--material-bar-contrast`     | `0.6`                                                                                                  | same                                                        | **luminosity compression**: maps the backdrop's 0…1 channel range to 0.2…0.8 (Apple: "adjusts the luminosity of background content")               |
| `--material-pane-fill`        | `--popover` 84%                                                                                        | `--popover` 88%                                             |                                                                                                                                                    |
| `--material-sidebar-fill`     | `--sidebar` 84%                                                                                        | `--sidebar` 88%                                             | follows `data-sidebar-colors`                                                                                                                      |
| `--material-pane-blur`        | `24px` (amended 2026-11-21, was 28px)                                                                  | same                                                        | Safari before 27.0 was slow with large blur radii on iPhone (A14)                                                                                  |
| `--material-pane-saturate`    | `1.5`                                                                                                  | same                                                        |                                                                                                                                                    |
| `--material-pane-contrast`    | `0.6`                                                                                                  | same                                                        |                                                                                                                                                    |
| `--material-muted-foreground` | `var(--muted-foreground)`                                                                              | `color-mix(in oklch, var(--dark-300) 50%, var(--dark-400))` | dark `--muted-foreground` (dark-400) reaches only 4.25 on dark bar glass (3.3)                                                                     |
| `--material-ring`             | `var(--primary-text)`                                                                                  | `var(--ring)`                                               | violet's light ring (step 500) reaches only 2.57 on bar glass                                                                                      |
| `--material-input-fill`       | `var(--card)`                                                                                          | `var(--dark-800)`                                           | inputs are opaque wells on glass (content layer)                                                                                                   |
| `--material-control`          | `--foreground` 6%                                                                                      | `--foreground` 10%                                          | translucent control fill on glass (search field, chips)                                                                                            |
| `--material-control-hover`    | `--foreground` 10%                                                                                     | `--foreground` 16%                                          | hover / highlighted item on glass                                                                                                                  |
| `--material-highlight`        | `white` 75%                                                                                            | `white` 14%                                                 | inner top specular line                                                                                                                            |
| `--material-edge`             | `--foreground` 12%                                                                                     | `black` 55%                                                 | darkened outer edge (iOS 27)                                                                                                                       |
| `--material-shadow-color`     | `oklch(0.2 0.02 256 / 0.16)`                                                                           | `oklch(0 0 0 / 0.5)`                                        |                                                                                                                                                    |
| `--material-bar-shadow`       | `0 8px 24px -16px var(--material-shadow-color)`                                                        | same                                                        | small                                                                                                                                              |
| `--material-pane-shadow`      | `0 24px 56px -16px var(--material-shadow-color), 0 4px 12px -4px var(--material-shadow-color)`         | same                                                        | "larger glass casts deeper shadows"                                                                                                                |
| ~~`--material-edge-fade`~~    | deleted (amended 2026-11-21)                                                                           | —                                                           | iOS 27's automatic scroll edge effect is uniform and "not decorative", one per view (A4, A5): the bar's defined bottom edge replaces the soft fade |
| `--scrim`                     | `black` 35%                                                                                            | `black` 55%                                                 | Apple's 35% dimming; no blur (was `bg-black/50` + `backdrop-blur-xs`)                                                                              |
| `reduced` fills               | bar `--card` 92%, pane `--popover` 94%, sidebar `--sidebar` 94%                                        | bar 94%, pane/sidebar 95%                                   | Apple's "frostier"; filters kept                                                                                                                   |
| `off` fills                   | `--card` / `--popover` / `--sidebar` (opaque), every `*-filter: none`, controls `--muted` / `--accent` | same                                                        | also the value of every fallback                                                                                                                   |

### 2.3 Files and CSS

New file: **`src/styles/theme/materials.css`**. Flat rules only, like `semantic.css`: `:root` or `:root[data-…]`, no `@media` and no nesting, because the contrast gate reads it. Import it in `src/styles/index.css` after `semantic.css`.

```css
/* MATERIALS — Liquid Glass for the control layer (plan G2). Flat rules only: the contrast gate
 * (scripts/arch/check-token-contrast.mjs) resolves this file for every combination. The fills are
 * neutral surfaces at an alpha; the numbers are mode-independent (light-dark() takes colours only). */
:root {
	--material-bar-blur: 16px;
	--material-bar-saturate: 1.8;
	--material-bar-contrast: 0.6;
	--material-bar-fill: light-dark(
		color-mix(in srgb, var(--card) 72%, transparent),
		color-mix(in srgb, var(--card) 80%, transparent)
	);
	--material-bar-filter: blur(var(--material-bar-blur)) saturate(var(--material-bar-saturate))
		contrast(var(--material-bar-contrast));

	--material-pane-blur: 24px; /* amended 2026-11-21 (was 28px) */
	--material-pane-saturate: 1.5;
	--material-pane-contrast: 0.6;
	--material-pane-fill: light-dark(
		color-mix(in srgb, var(--popover) 84%, transparent),
		color-mix(in srgb, var(--popover) 88%, transparent)
	);
	--material-sidebar-fill: light-dark(
		color-mix(in srgb, var(--sidebar) 84%, transparent),
		color-mix(in srgb, var(--sidebar) 88%, transparent)
	);
	--material-pane-filter: blur(var(--material-pane-blur)) saturate(var(--material-pane-saturate))
		contrast(var(--material-pane-contrast));

	--material-muted-foreground: light-dark(
		var(--muted-foreground),
		color-mix(in oklch, var(--dark-300) 50%, var(--dark-400))
	);
	--material-ring: light-dark(var(--primary-text), var(--ring));
	--material-input-fill: light-dark(var(--card), var(--dark-800));
	--material-control: light-dark(
		color-mix(in srgb, var(--foreground) 6%, transparent),
		color-mix(in srgb, var(--foreground) 10%, transparent)
	);
	--material-control-hover: light-dark(
		color-mix(in srgb, var(--foreground) 10%, transparent),
		color-mix(in srgb, var(--foreground) 16%, transparent)
	);
	--material-highlight: light-dark(
		color-mix(in srgb, white 75%, transparent),
		color-mix(in srgb, white 14%, transparent)
	);
	--material-edge: light-dark(
		color-mix(in srgb, var(--foreground) 12%, transparent),
		color-mix(in srgb, black 55%, transparent)
	);
	--material-shadow-color: light-dark(oklch(0.2 0.02 256 / 0.16), oklch(0 0 0 / 0.5));
	/* (amended 2026-11-21) no --material-edge-fade: the bar is the scroll edge effect itself */
	--scrim: light-dark(
		color-mix(in srgb, black 35%, transparent),
		color-mix(in srgb, black 55%, transparent)
	);
}
:root[data-transparency='reduced'] {
	--material-bar-fill: light-dark(
		color-mix(in srgb, var(--card) 92%, transparent),
		color-mix(in srgb, var(--card) 94%, transparent)
	);
	--material-pane-fill: light-dark(
		color-mix(in srgb, var(--popover) 94%, transparent),
		color-mix(in srgb, var(--popover) 95%, transparent)
	);
	--material-sidebar-fill: light-dark(
		color-mix(in srgb, var(--sidebar) 94%, transparent),
		color-mix(in srgb, var(--sidebar) 95%, transparent)
	);
}
/* OFF: the opaque equivalent. Every fallback block in materials-fallbacks.css repeats exactly
   these declarations (a unit test compares them). */
:root[data-transparency='off'] {
	--material-bar-fill: var(--card);
	--material-pane-fill: var(--popover);
	--material-sidebar-fill: var(--sidebar);
	--material-bar-filter: none;
	--material-pane-filter: none;
	--material-bar-saturate: 1;
	--material-bar-contrast: 1;
	--material-pane-saturate: 1;
	--material-pane-contrast: 1;
	--material-control: var(--muted);
	--material-control-hover: var(--accent);
}
```

New file: **`src/styles/theme/materials-fallbacks.css`**. It is not gated, because it only resolves to the gated `off` values. Import it right after `materials.css`.

- `:root:root` has the same specificity as `:root[data-transparency]` (0,2,0) and comes later, so the OS setting wins over the customizer. That is deliberate: Apple's system settings apply "across the board".

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
	:root:root {
		/* = the off block */
	}
}
@media (prefers-reduced-transparency: reduce) {
	:root:root {
		/* = the off block */
	}
}
@media (prefers-contrast: more) {
	:root:root {
		/* = the off block */
		--material-edge: var(--input);
		--material-highlight: transparent;
	}
}
@media (forced-colors: active) {
	:root:root {
		/* = the off block */
	}
}
@media print {
	:root:root {
		/* = the off block */
		--material-bar-shadow: none;
		--material-pane-shadow: none;
	}
}
/* Mid-range Android budget (section 5): large panes are opaque on touch-first devices; bars keep glass with a smaller blur. */
@media (pointer: coarse) {
	:root:root:not([data-transparency='off']) {
		--material-pane-fill: var(--popover);
		--material-sidebar-fill: var(--sidebar);
		--material-pane-filter: none;
		--material-pane-saturate: 1;
		--material-pane-contrast: 1;
		--material-bar-blur: 12px;
	}
}
```

Utilities: add them in **`src/styles/utilities.css`**. These are the ONE source of glass: no component, no SVG.

```css
@utility material-bar {
	background-color: var(--material-bar-fill);
	-webkit-backdrop-filter: var(--material-bar-filter);
	backdrop-filter: var(--material-bar-filter);
	box-shadow:
		inset 0 1px 0 0 var(--material-highlight),
		0 0 0 1px var(--material-edge),
		var(--material-bar-shadow);
	/* tokens the content on glass reads (scoped re-declaration, as the pattern topbar already does) */
	--muted-foreground: var(--material-muted-foreground);
	--subtle-foreground: var(--material-muted-foreground);
	--ring: var(--material-ring);
	--muted: var(--material-control);
	--accent: var(--material-control-hover);
	--input-fill: var(--material-input-fill);
	@media (forced-colors: active) {
		border: 1px solid CanvasText;
	}
}
@utility material-pane {
	/* same as material-bar with --material-pane-* and --material-pane-shadow */
}
@utility material-sidebar {
	/* same as material-pane, background-color: var(--material-sidebar-fill) */
}
/* no glass on glass: a float opened over an open modal surface is opaque */
body:has(
		:is(
			[data-slot='dialog-content'],
			[data-slot='sheet-content'],
			[data-slot='alert-dialog-content']
		)[data-state='open']
	)
	:is(
		[data-slot='popover-content'],
		[data-slot='dropdown-menu-content'],
		[data-slot='select-content'],
		[data-slot='dropdown-menu-sub-content']
	) {
	background-color: var(--popover);
	-webkit-backdrop-filter: none;
	backdrop-filter: none;
}
```

The bridge in `tokens.css` `@theme inline` gains `--color-scrim: var(--scrim)`. Then `bg-scrim` is a plain token utility with no alpha modifier.

**The SVG refraction (GlassSurface / Svelte Bits) is not used, not even as progressive enhancement.** It is Chromium-only, and `@supports` cannot detect it (Safari parses `url()` and draws nothing). Its cost is full-resolution displacement per element. Its effect is decorative and invisible at the alphas legibility needs. Task 31 records this in CLAUDE.md.

---

## 3. Legibility guarantee: the contrast gate, version 2

### 3.1 Method (normative for G3)

For every combination and every **layer** (section 3.2), the gate does the following.

1. **Backdrop set `B`.** The tokens and literals that can appear behind the layer in this product, resolved for the combination. Images, avatars, logos and the auth particles count as the literals `#000` and `#fff` (no restriction on what may scroll under; leads, orders and inventory will show product images).
2. **Filter bound.** The filter list is `blur → saturate(s) → contrast(c)`. Blur and saturate are linear, so they commute: `saturate(blur(x)) = blur(saturate(x))`.
   - Apply the feColorMatrix `saturate` matrix to each member of `B` and clamp. Do it twice, once on sRGB-encoded values and once on linearRGB values, because browsers have differed; keep both results.
   - Blur makes convex combinations, so every blurred pixel lies inside the **per-channel envelope** of the saturated set. Take the two corners `lo = (min r, min g, min b)` and `hi = (max r, max g, max b)`. Neither corner need be a real backdrop, so the bound is conservative.
   - Apply `contrast(c)` per channel: `v' = (v − 0.5)·c + 0.5`, then clamp.
   - Blur never makes these extremes worse. Small features (thin text, a 32 px avatar) are diluted by the blur, so they are milder in reality; the gate ignores that, which keeps it safe.
3. **Composite.** Paint the material fill (a `color-mix(…, transparent)`) over each corner in sRGB, the way browsers composite. The resolver's existing "`transparent` composites over `over`" rule does this when the corner is passed as `over`.
4. **Pairs.** For every text token allowed on that layer, require ≥ 4.5 against **each** composited corner (both colour spaces). For every non-text mark (ring, input border, indicator, the active-nav bar), require ≥ 3. Text on a control fill (`--material-control(-hover)`) is checked against the control composited over the material composite.
5. **"Not glass" rule.** In `data-transparency='glass'`, a material fill whose alpha is ≥ 0.90 fails with: "`<material>` at `<alpha>` is not glass: lift the text token (vibrancy), add a dim layer behind the layer, or restrict its backdrop". The fix is never to make the glass nearly opaque.
6. **The axes gain** `transparency: ['glass', 'reduced', 'off']`: 8 × 2 × 5 × 5 × 3 = 1,200 combinations.
   - `off` must produce exactly the opaque pairs. Its fill has no alpha, so `over` is irrelevant.
   - Layout is not an axis. The backdrop sets are the union over all five layouts, for example the boxed canvas `--primary-500`.

### 3.2 Layers and their backdrop sets

| Layer                                                               | Utility          | Backdrop set `B`                                                                                           | Text allowed (4.5)                                                                                                        | Marks (3)                                                                                            |
| ------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `topbar`, `hnav`, `bulk-bar`                                        | material-bar     | background, card, muted, primary, primary-soft, foreground, destructive-soft, warning-soft, `#000`, `#fff` | foreground, material-muted-foreground; on `material-control`: foreground                                                  | material-ring; primary-indicator (hnav active bar)                                                   |
| `sidebar-desktop` (lg+; nothing scrolls under it)                   | material-sidebar | background, primary-100, primary-200, primary-soft (the body wash), primary-500 (boxed canvas)             | sidebar-foreground, sidebar-muted-foreground; sidebar-accent-foreground on sidebar-accent                                 | sidebar-ring; (amended 2026-11-21) `primary-indicator` for nav icons when `sidebarColors=light` (A9) |
| `sidebar-mobile` (sheet)                                            | material-sidebar | `#000` and `#fff` under `--scrim`                                                                          | same                                                                                                                      | same                                                                                                 |
| `overlay` (dialog, sheet, alert-dialog, customizer, command)        | material-pane    | `#000` and `#fff` under `--scrim` (the page, any image, or a lower modal)                                  | foreground, material-muted-foreground, destructive, primary-text, success/warning/info; foreground on material-input-fill | material-ring, input, primary-indicator                                                              |
| `float` (popover, menus, select, combobox, calendar, neutral toast) | material-pane    | background, card, muted, primary, foreground, `#000`, `#fff`                                               | as overlay; foreground and material-muted-foreground on material-control-hover; destructive (menu "Delete")               | material-ring, primary-indicator (check marks)                                                       |
| `auth-card`                                                         | material-pane    | background, primary-100…600 (washes, particles), foreground                                                | foreground, material-muted-foreground, primary-text, destructive                                                          | material-ring, input                                                                                 |

### 3.3 Worked numbers (default palette `leadkart / default / light sidebar`; computed with the gate's own resolver and culori)

**Resolved colours.**

- Light: foreground `#0b121a` (Y 0.0059), muted-foreground `#454e58` (Y 0.0744), subtle-foreground `#58626c` (Y 0.118), card `#ffffff`.
- Dark: foreground `#f1f5f9` (Y 0.908), muted-foreground `#90a1b9` (Y 0.350), card `#0f172b` (Y 0.0088).

**The bar, light, with `contrast(0.6)`.**

1. The corners `#000` and `#fff` become 0.2 and 0.8 per channel.
2. Dark corner after compositing: 0.72·1 + 0.28·0.2 = 0.776, so Y = ((0.776 + 0.055)/1.055)^2.4 = **0.564**. The light corner gives Y = 0.877.
3. Contrast at the dark corner:
   - foreground: (0.564 + 0.05)/(0.0059 + 0.05) = **10.99**
   - muted-foreground: 0.614/0.1244 = **4.94**
   - subtle-foreground: 0.614/0.168 = **3.65 ✗**, which is why subtle collapses into muted on glass.
4. Minimum alpha for muted text: it needs Y ≥ 4.5·0.1244 − 0.05 = 0.510, so the encoded value v ≥ 0.742, so a ≥ (0.742 − 0.2)/(1 − 0.2) = **0.68**. Without the contrast compression it would be a ≥ 0.74.

**The bar, dark.**

1. The light corner `#fff` becomes 0.8.
2. Composite: 0.8·card + 0.2·0.8 = `#343b4b`, Y **0.044**.
3. Foreground: 0.958/0.094 = 10.19. Muted-foreground (dark-400): 0.400/0.094 = **4.25 ✗**. Text needs Y ≥ 4.5·0.094 − 0.05 = 0.373.
4. Hence `--material-muted-foreground` = dark-300/400 mix (Y ≈ 0.50), which gives **5.57** over the whole matrix.

**Minimum alpha per material (from `foreground` / `muted-foreground` / `subtle-foreground`), with the images backdrop.**

| Material | Mode  | No compression (c = 1) | c = 0.6            | Chosen | Margin at chosen alpha (worst over 400 combinations)          |
| -------- | ----- | ---------------------- | ------------------ | ------ | ------------------------------------------------------------- |
| bar      | light | 0.49 / 0.75 / 0.86     | 0.36 / 0.68 / 0.83 | 0.72   | fg 10.99, material-muted 4.94, material-ring 3.2+             |
| bar      | dark  | 0.62 / 0.87 / 0.89     | 0.51 / 0.83 / 0.86 | 0.80   | fg 9.93, material-muted 5.57, ring 3.80                       |
| pane     | light | same as bar            | same as bar        | 0.84   | fg 14.02, muted 6.30, destructive 5.60, input 3.61, ring 3.28 |
| pane     | dark  | same as bar            | same as bar        | 0.88   | fg 12.29, material-muted 6.90, destructive 4.53, input 5.18   |

### 3.4 What fails, and what is done instead of raising alpha to opaque

These are applied in G1 and G2.

- **The light sidebar.**
  - Today's `--sidebar-foreground` (oklch 0.551, grey) needs an alpha of **0.95** on glass. It fails the "not glass" rule.
  - Fix: lift the text, do not raise the alpha. `--sidebar-foreground` becomes `light-dark(var(--muted-foreground), var(--dark-300))`. That is the owner's "dark contrast text", and it gives **4.95** worst-case on desktop.
- **The tinted sidebars at 0.84 / 0.88.**
  - `dark` (slate-800) fails: its text oklch 0.707 reaches 3.5–4.6. Lift it to `oklch(0.82 0.02 261)`.
  - `purple` (#b98fd7) reaches 3.9–4.9. Lift it to `oklch(0.80 0.09 305)`.
  - `sky` (sky-300) reaches 4.0–4.8. Lift it to `oklch(0.88 0.07 230)`.
  - `brand` passes (8.9+).
  - Worst after the lifts: 5.37 desktop, 5.61 mobile.
  - These are starting values; the gate is the judge.
- **Subtle text, and destructive text on the bar.**
  - Subtle text: not allowed on glass (it collapses into material-muted).
  - Destructive text on the bar reaches 4.39 light and 3.78 dark. No destructive text is placed on bars; the gate's bar text list does not include it.
- **Input borders on the bar.** 2.83 light. No form field is placed directly on a bar. The topbar search is a button with a text label on `material-control`, which WCAG 1.4.11 does not require to have a 3:1 boundary.

### 3.5 Pattern topbar

As tinted glass (fill = `--primary` at α, white or 950 text, images backdrop), the violet palette in dark mode reaches 4.42 at 0.85 and 4.74 at 0.90. So it fails below the "not glass" threshold. Decision GD8 keeps `navType=pattern` as an **opaque** primary band: today's rule in `layouts.css`, plus `backdrop-filter: none; box-shadow: none`.

### 3.6 `check-tokens` changes (G2)

The alpha rule for text, rings, input borders and solid fills is unchanged. New rules:

- **(m1)** `backdrop-*` utilities (`backdrop-blur-*`, `backdrop-saturate-*`, `supports-backdrop-filter:*`) and the CSS properties `backdrop-filter` / `-webkit-backdrop-filter` are legal only in:
  - `src/styles/theme/materials*.css`
  - `src/styles/utilities.css` (the `@utility material-*` blocks and the no-glass-on-glass rule)
  - `src/styles/theme/layouts.css` (the pattern band's `backdrop-filter: none`)
- **(m2)** `ALLOWED_ALPHA` becomes empty. `bg-black/50` is replaced by `bg-scrim`. The normaliser rewrites it, and the scrim's `supports-backdrop-filter:backdrop-blur-xs` is dropped.
- **(m3)** A `--material-*` or `--scrim` declaration outside `src/styles/theme/materials*.css` fails. A `var(--material-*)` reference is legal in `src/styles/**` and in `<style>` blocks of `src/lib/layouts/**`.
- **(m4)** `will-change` anywhere in `src/**` except `src/styles/animations.css` fails, because it pins layers and multiplies the cost of blurred layers.
- **(m5)** A bare `text-primary` (word boundary, not followed by `-`) fails. Use `text-primary-text` (G1).

The only legal alpha in components is now a material utility or `bg-scrim`. Ad-hoc `/NN`, `opacity-*` on surfaces and `bg-[color-mix(…)]` stay banned.

---

## 4. Fallbacks and accessibility

| Condition                                                                         | Result                                                                                                                                                           | How                                                                                                                                    |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Customizer "Transparency: Glass" (default)                                        | materials as in 2.2                                                                                                                                              | `<html data-transparency="glass">` at SSR                                                                                              |
| "Tinted" (amended 2026-11-21; was labelled "Reduced")                             | frosted: fills 92–95%, same filters (the "fully tinted" end of Apple's iOS 27 slider)                                                                            | `data-transparency="reduced"`                                                                                                          |
| "Solid" (was "Off")                                                               | opaque surfaces, no backdrop filter, edges and shadows kept (same shape language)                                                                                | `data-transparency="off"`                                                                                                              |
| iPhone Liquid Glass slider (amended 2026-11-21)                                   | no effect: web content cannot observe it (no media feature, no API; A3, A13–A15)                                                                                 | the customizer is the only control                                                                                                     |
| Safari Adaptive Dark Mode (27.3 beta; amended 2026-11-21)                         | must not re-colour the gated light theme                                                                                                                         | `color-scheme: only light` for the light and black-white modes (G9 Step 0)                                                             |
| OS Reduce Transparency (Windows "Transparency effects: off", macOS / Chrome 118+) | `off`, whatever the customizer says                                                                                                                              | `@media (prefers-reduced-transparency: reduce)`. Safari and Firefox do not report it (§0.2); users there pick "Off" in the customizer. |
| Increase Contrast                                                                 | `off` + edge = `--input` (3:1 border), no highlight (Apple: "predominantly black or white … contrasting border")                                                 | `@media (prefers-contrast: more)`                                                                                                      |
| Forced colours (Windows High Contrast)                                            | `off` + `border: 1px solid CanvasText` on every material (box-shadow is forced to none; background alpha is kept, so an opaque fill is mandatory)                | `@media (forced-colors: active)` in the fallbacks and the utilities                                                                    |
| No `backdrop-filter` support                                                      | `off` (a translucent fill without blur would show sharp content behind text)                                                                                     | `@supports not`                                                                                                                        |
| Print                                                                             | `off`, no shadows                                                                                                                                                | `@media print`                                                                                                                         |
| Reduced motion                                                                    | no change to materials; the existing global rule removes the open/close animations, so no blur animates in or out (HIG: avoid "animating into and out of blurs") | existing `base.css`                                                                                                                    |
| Coarse pointer                                                                    | panes and sidebar opaque; bars glass at a 12 px blur                                                                                                             | section 5                                                                                                                              |

**Preference plumbing.** Add a ninth axis to `src/lib/features/preferences/schema.ts`: `transparency: ['glass', 'reduced', 'off']`, default `'glass'`, attribute `data-transparency`.

- The codec's per-field fallback makes old cookies decode to the default. The `{"v":1}` version is unchanged.
- The cookie grows by about 35 bytes, to about 265 of 300.
- `htmlShellHandle` already writes every axis through `htmlAttributes()`: no flash, no script, CSP unchanged.

**WCAG 2.2 AA in every mode.** The gate proves 1.4.3 and 1.4.11 for every combination × transparency level. 2.4.7 and 2.4.11: the focus ring on glass is `--material-ring`, at 3:1 over the composite. 1.4.12: nothing on glass clips text. The a11y e2e runs light × dark × glass × off (G9).

---

## 5. Performance budget (mid-range Android first)

| Rule                                                         | Value                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filtered layers **over moving content** (things that scroll) | fine pointer ≤ 3 (topbar, hnav, bulk bar); coarse pointer ≤ 2 (topbar, bulk bar)                                                                                                                                                                                                                                                |
| Filtered layers in any state                                 | ≤ 4 (for example topbar + sidebar + dialog pane; a popover inside the dialog is opaque by the no-glass-on-glass rule)                                                                                                                                                                                                           |
| Blurred area at rest                                         | ≤ 35% of the viewport (1280 × 800: topbar 75 px ≈ 9% + sidebar 240 px ≈ 19% = 28%)                                                                                                                                                                                                                                              |
| Scrim                                                        | dim only, **never blurred** (a full-viewport blur is the most expensive layer there is; removing today's `backdrop-blur-xs` is a net saving)                                                                                                                                                                                    |
| Coarse pointer                                               | panes and sidebar opaque; bar blur 12 px                                                                                                                                                                                                                                                                                        |
| Never filtered                                               | table bodies, sticky table headers (hard edge), the ContextBanner, inputs, anything inside a scroll container other than the page, any element that repaints every frame. The one exception is the auth card over the STATIC particles, on fine pointer only (GD22: the backdrop does not drift, so the blur does not repaint). |
| `will-change`                                                | banned outside `animations.css` (rule m4); materials never get it                                                                                                                                                                                                                                                               |
| Animated blur                                                | overlays animate opacity and scale only (tw-animate-css); a material's blur radius is never transitioned                                                                                                                                                                                                                        |
| CSS budget                                                   | materials + fallbacks + utilities ≈ 1.5 KB gzip; `size-limit` CSS ≤ 60 KB is checked in G8 and at CHECKPOINT G                                                                                                                                                                                                                  |
| JS                                                           | 0 bytes added (the customizer group is config)                                                                                                                                                                                                                                                                                  |

**Measured checks (G8).**

1. **`tests/e2e/material-budget.spec.ts`: a hard gate.** At 1280 × 800 and 390 × 844 (with `hasTouch`, `isMobile`), count the elements whose computed `backdrop-filter` is not `none`, in each state:
   - at rest;
   - user menu open;
   - customizer open;
   - FormSheet open with a Select open;
   - command palette open.

   Assert the budget above. Also assert that no material has a descendant with computed `position: fixed`. That is the containing-block pitfall (Filter Effects 2 §2): today everything floating is portalled to `body`, and this pins it.

2. **`tests/e2e/material-scroll.perf.spec.ts`: annotation, Chromium only.** Throttle the CPU through CDP (`Emulation.setCPUThrottlingRate { rate: 4 }`). Scroll the Task 24 bench route (`/data-table-bench`, 1,000 rows) by 40 px per rAF for 3 s. Record the rAF deltas for `transparency=glass` and `off`. Annotate the p95 frame time and the share of frames over 20 ms.
   - Soft assertion: glass's share of slow frames ≤ off's + 5 percentage points.
   - Same for `/signin` (the auth card over the particles). (amended, GD22) The first measurement failed (21% slow frames against 0% at 4x CPU while the particles drifted); the answer is a static backdrop, not an opaque card. The card is glass in every motion setting; the bench runs it idle and under a pointer sweep, glass vs solid within the +5 points.
   - CPU throttling does not model the GPU, so the owner also runs the manual checklist in G12 on a real mid-range Android over remote debugging.

**Automatic downgrade by `deviceMemory` / `hardwareConcurrency`: no.**

- Reading them needs client JavaScript after the first paint. That means a visible glass → opaque switch after hydration, or a write to the preference cookie the user never chose.
- The `Sec-CH-Device-Memory` client hint is Chromium-only and arrives only from the second request.
- The CSS-only `pointer: coarse` rule covers the field-rep phones with no shift and no CSP change. The owner can revisit this (Q6).

---

## 6. Colour and type

### 6.1 The L37 darker primaries

Today `--primary` is both a FILL and a TEXT colour. L37 stepped the fills darker so that the TEXT use passes. The owner rejected that route. The roles split, and each gets the lightest legal step:

| Role                                                                                                                       | Token (new or changed)                                                                 | Rule                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Labelled fill (buttons, selected chips, `Badge brand`, calendar selected day, avatar fallback, `sidebar-primary`)          | `--primary`, `--primary-foreground`, `--primary-hover`                                 | **Vivid**: step 500 if white or step 950 reaches 4.5 on it, else 600. The foreground is white if it reaches 4.5, else step 950 (dark label on a vivid fill, Apple's yellow and green buttons). Hover mixes 15% **away from** the foreground (toward black under a white label, toward white under a dark one).   |
| Text in the primary colour (links, active nav label, `text-primary` uses)                                                  | `--primary-text` (new; bridged `text-primary-text`)                                    | 4.5 on background, card, muted, primary-soft and every material composite. Starts from today's L37 steps (leadkart oklch 0.34 0.14 296; violet, fuchsia, orange 700; green, teal, lime, amber 800). These steps stay because WCAG requires them **for text**; text is a small share of the primary colour's use. |
| Non-text marks (checkbox box, radio dot, switch track, slider range, progress, tab underline, active-nav bar, `--chart-1`) | `--primary-indicator`, `--primary-indicator-foreground` (new)                          | 3:1 on background, card, muted and the composites. Value: today's `--primary-ring` step (leadkart 500; violet 500; orange, fuchsia 600; green, teal, lime, amber 700). The glyph on it is white.                                                                                                                 |
| Focus ring                                                                                                                 | `--ring` (unchanged), `--material-ring` on glass                                       | 3:1                                                                                                                                                                                                                                                                                                              |
| Dark mode                                                                                                                  | unchanged: fill `--primary-on-dark` (step 400, or 300 for leadkart) with step 950 text | dark already used light, vivid steps                                                                                                                                                                                                                                                                             |

**Computed light-mode steps** (white / step-950 contrast on the fill):

| Colour   | 500                   | 600             | New fill + label                            | Was (L37)  |
| -------- | --------------------- | --------------- | ------------------------------------------- | ---------- |
| leadkart | `#953fc9` 5.48 / 3.79 | `#502d81` 10.33 | **500 + white**                             | oklch 0.34 |
| violet   | 4.40 / 3.47           | `#7f22fe` 5.88  | **600 + white**                             | 700        |
| fuchsia  | 3.53 / 4.20           | `#c800de` 4.66  | **600 + white**                             | 700        |
| orange   | 3.66 / 4.51           | `#e13215` 4.50  | **600 + white** (gate: if < 4.5, 500 + 950) | 700        |
| green    | 2.08 / **6.98**       | 3.05 / 4.77     | **500 + 950**                               | 800        |
| teal     | 2.42 / **5.97**       | 3.66 / 3.96     | **500 + 950**                               | 800        |
| lime     | 1.96 / **7.47**       | 3.06 / 4.78     | **500 + 950**                               | 800        |
| amber    | 2.15 / **6.99**       | 3.19 / 4.70     | **500 + 950**                               | 800        |

**What reverts:**

- `--primary-solid` (renamed `--primary-fill`; one block per colour);
- `--primary-foreground` (it flips to 950 for green, teal, lime and amber);
- `--primary-hover` (mixes in the new direction);
- `--sidebar-primary` (follows `--primary`).

**What stays opaque:** every hover token (`--primary-hover`, `--destructive-hover`, `--secondary-hover`, `--row-hover`). On glass, hover is the translucent `--material-control-hover`. The text on it is gated.

**Links:** `text-primary-text`, underlined on hover. They no longer change colour on hover, so the "link hover" pairs `primary-hover / background|card` are deleted from the gate.

**Switch:** the checked track is `bg-primary-indicator` with the `bg-background` thumb. That passes 3:1, where a vivid lime track would fail with a white thumb (1.96).

**Gate pairs (G1):**

- `primary-text / {background, card, muted, popover, primary-soft, row-hover, sidebar-accent}` (4.5)
- `primary-foreground / primary`, `/ primary-hover` (4.5)
- `primary-indicator / {background, card, muted, popover}` (3)
- `primary-indicator-foreground / primary-indicator` (3; the check glyph)
- `background / primary-indicator` (3; the switch thumb)
- the old `primary / surface` text pairs are deleted (primary is no longer text).

### 6.2 Sidebar active item

(SUPERSEDED by GD23: `--sidebar-accent` is a TRANSLUCENT tint of the accent, gated against the composited sidebar, and the selection is carried by the indicator bar.) `--sidebar-accent` becomes opaque: `color-mix(in oklch, var(--sidebar-accent-foreground) 12%, var(--sidebar))` instead of mixing toward `transparent`. `--sidebar-accent-foreground` is `light-dark(var(--primary-text), var(--primary-on-dark))` for the light sidebar. The coloured sidebars keep their own.

### 6.3 Typography on glass

- **The font stays the system stack** (L13). On Apple devices it is SF Pro, which is exactly the Liquid Glass look. Elsewhere it is Segoe UI, Roboto or the local default.
- **On glass:** labels and nav items `text-sm font-medium` (14 px / 500), titles `font-semibold`, body `text-sm` 400 only on panes. Nothing below 12 px. The tooltip keeps `text-xs`, and it is opaque.
- **Composited layers lose subpixel antialiasing.** Chromium falls back to greyscale AA on translucent layers, so thin weights look lighter. That is why 500 is the minimum for labels on glass.

### 6.4 Shape language (G7)

- **Concentric radii.** An inner radius equals the outer radius minus the padding.
  - Pane surfaces (dialog, alert, popover, menu, select list, command): `rounded-xl` (1 rem).
  - Their items: `rounded-lg` (0.75 rem) with `p-1` on the list.
  - Edge-attached bars and sheets have no radius on the attached edges (geometry stays Domiex's, L21).
  - Semibox and boxed panes keep `--shell-radius`.
- **Capsules** for controls that sit on glass: topbar icon buttons `rounded-full`, the topbar search trigger `rounded-full`, the hnav items, BulkActionBar buttons. Buttons in the content layer: see Q1 (default: capsule for every `Button` size except `link`). Inputs stay rounded rectangles (`rounded-md`), as Apple's text fields do.
- **Shadows.** The material shadows replace `shadow-lg` / `shadow-md` plus `ring-1 ring-border` on the material surfaces. Cards keep `shadow-card` (content layer).
- **Edges.** Inner top `--material-highlight` (1 px) plus the outer `--material-edge` (1 px darkened rim, iOS 27). Both are decorative: no information depends on them, except under Increase Contrast, where the edge becomes `--input` (3:1).
- **Scroll edge (amended 2026-11-21).** The bar material IS the scroll edge effect: a uniform blurred band whose bottom is a defined line (`--material-edge`). This is iOS 27's automatic style, which is "more opaque … for top toolbars that contain a large number of controls, text … and pinned table headers" and is "not decorative" (A4, A5).
  - No soft gradient fade.
  - **One effect per view.** In `layout=horizontal` the topbar draws no bottom edge, and the horizontal nav below it carries the edge, so the two read as one bar.
  - Pinned regions use the **hard edge**: an opaque fill and a `border-b border-border`. These are the ContextBanner, sticky table headers and the DataTable toolbar when it is sticky.
- **Toolbar content (amended 2026-11-21, A11).** Icons are borderless. At most one prominent (tinted, `variant="default"`) action per bar, on the trailing side. Everything else is monochrome.

---

## 7. Component-by-component map

"Do not change" applies to every row. Behaviour stays as it is:

- the busy veto (`createBusyVeto`) on Dialog, Sheet and (from Task 20) AlertDialog;
- focus management and the overlay-name assertion;
- `z-(--z-modal)` shared by scrim and panel (the stacked-modal order; `tests/unit/components/stacked-modals.test.ts` stays green);
- e2e ids (`#main-content`, `form="<id>"`, `button[aria-label="Search (Cmd+K)"]`, `[data-scope-context]`);
- RTL-safe utilities and i18n.

| Part                                                                                                                                                                                                          | Material                                                   | Class change (generated files through `scripts/shadcn/normalize.mjs` + `CUSTOMIZATIONS.md`)                                                                                                                                                                                                                                                                                                                                     | Must NOT change                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/dialog/dialog-overlay`, `sheet-overlay`, `alert-dialog-overlay`                                                                                                                                           | scrim                                                      | `bg-black/50 supports-backdrop-filter:backdrop-blur-xs` → `bg-scrim`                                                                                                                                                                                                                                                                                                                                                            | `z-(--z-modal)`, `isolate`, the fade                                                                                                                    |
| `ui/dialog/dialog-content`, `ui/alert-dialog/alert-dialog-content`                                                                                                                                            | pane                                                       | `bg-popover … shadow-lg ring-1 ring-border` → `material-pane text-popover-foreground`; keep `rounded-xl`                                                                                                                                                                                                                                                                                                                        | sizes (L42), the busy veto, the close button, the title assertion                                                                                       |
| `ui/sheet/sheet-content`                                                                                                                                                                                      | pane                                                       | `bg-popover … shadow-lg` → `material-pane`; the side border becomes the edge (drop `data-[side=*]:border-*`)                                                                                                                                                                                                                                                                                                                    | sides, sizes, slide animation, the busy veto                                                                                                            |
| `ui/popover/popover-content`, `dropdown-menu-content`, `dropdown-menu-sub-content`, `select-content`, `command` (inside `Command.Dialog` the dialog is the pane; the `command` root becomes `bg-transparent`) | pane                                                       | `bg-popover … shadow-md ring-1 ring-border rounded-lg` → `material-pane rounded-xl`; item highlight `bg-accent` stays (it now resolves to `--material-control-hover`); items `rounded-lg`                                                                                                                                                                                                                                       | `z-(--z-popover)`, the transform-origin variables, keyboard behaviour, `aria-*`                                                                         |
| calendar / range-calendar popups (inside `Popover.Content`)                                                                                                                                                   | pane (via the popover)                                     | selected day `bg-primary text-primary-foreground` (vivid fill); today marker `ring` → `ring-(--material-ring)` through the scoped `--ring`                                                                                                                                                                                                                                                                                      | grid semantics, dropdown captions                                                                                                                       |
| `ui/tooltip/tooltip-content`                                                                                                                                                                                  | none (opaque, inverted)                                    | none                                                                                                                                                                                                                                                                                                                                                                                                                            | `bg-foreground text-background`                                                                                                                         |
| `ui/sonner/sonner`                                                                                                                                                                                            | pane (neutral toast); typed toasts opaque soft fills (L41) | `toast: 'material-pane text-popover-foreground rounded-xl'`; drop `--normal-bg` in the `style` attribute                                                                                                                                                                                                                                                                                                                        | the typed `!` classes, the icons, `position`                                                                                                            |
| `ui/sidebar/sidebar` (inner `[data-slot=sidebar-inner]`)                                                                                                                                                      | sidebar                                                    | `bg-sidebar` → `material-sidebar`; mobile `Sheet.Content` `bg-sidebar` → `material-sidebar`                                                                                                                                                                                                                                                                                                                                     | `--sidebar-width*`, collapse logic, `Sidebar.Provider`, the mobile sheet's title                                                                        |
| `ui/sidebar/sidebar-menu-button` active state                                                                                                                                                                 | —                                                          | `data-active:bg-sidebar-accent` (now opaque) + `text-sidebar-accent-foreground font-medium`                                                                                                                                                                                                                                                                                                                                     | `aria-current`                                                                                                                                          |
| `layouts/NavItem` icons (amended 2026-11-21, A9)                                                                                                                                                              | —                                                          | (SUPERSEDED by GD23: `--sidebar-icon` is `--sidebar-muted-foreground` for every sidebar colour; the active item is marked by `--sidebar-indicator`) light sidebar: icon `text-sidebar-icon` with `--sidebar-icon: var(--primary-indicator)` under `:root[data-sidebar-colors='light']`, else `var(--sidebar-foreground)` (new token in `semantic.css`, bridged); labels stay `sidebar-foreground`                               | icon size, `aria-hidden` on icons                                                                                                                       |
| Menus: UserMenu, RowActionsMenu (Task 25), DataTable column menu (Task 23), CommandPalette groups (amended 2026-11-21, A10)                                                                                   | pane                                                       | icons **all or none per group**; no group mixes iconned and plain items                                                                                                                                                                                                                                                                                                                                                         | items, shortcuts                                                                                                                                        |
| `ui/table/table-header` (sticky in DataTable)                                                                                                                                                                 | hard edge                                                  | `bg-card border-b border-border`; no filter                                                                                                                                                                                                                                                                                                                                                                                     | `aria-sort`, sticky placement                                                                                                                           |
| `ui/button`                                                                                                                                                                                                   | —                                                          | variants read `--primary` (vivid); `link` variant `text-primary-text hover:underline`; radius per Q1                                                                                                                                                                                                                                                                                                                            | `loading`, `href`, `focusableWhileLoading`                                                                                                              |
| `ui/checkbox`, `radio-group-item`, `switch`, `slider`, `progress`, `tabs-trigger` (line variant)                                                                                                              | —                                                          | `bg-primary` / `border-primary` → `bg-primary-indicator` / `border-primary-indicator`; check glyph `text-primary-indicator-foreground` (normaliser family map, like `Z_BY_FAMILY`)                                                                                                                                                                                                                                              | states and roles                                                                                                                                        |
| `ui/card/card`                                                                                                                                                                                                | content (opaque)                                           | delete the misnamed `surface="glass"` variant (it was opaque already; the four dashboard uses move to the default)                                                                                                                                                                                                                                                                                                              | other variants                                                                                                                                          |
| `ui/AuthCard`                                                                                                                                                                                                 | pane                                                       | `bg-card border border-border rounded-xl shadow-card` → `material-pane rounded-xl`                                                                                                                                                                                                                                                                                                                                              | the border-glow animation stays off under reduced motion                                                                                                |
| `layouts/Topbar`                                                                                                                                                                                              | bar                                                        | `bg-card border-border border-b` → `material-bar`; search trigger `rounded-full bg-muted border-0` (muted = control fill on glass); icon buttons `rounded-full`; (amended 2026-11-21) no fade `::after`: the bar's own bottom edge is the scroll edge; in `layout=horizontal` the topbar's bottom edge is removed (`layouts.css`: `:root[data-layout='horizontal'] [data-shell='topbar']` drops the edge from its `box-shadow`) | layout placement in `layouts.css`, `aria-label="Search (Cmd+K)"`, the mode icon CSS swap                                                                |
| pattern nav type (`layouts.css`)                                                                                                                                                                              | opaque band                                                | add `backdrop-filter: none; box-shadow: none;` to the existing rule (GD8)                                                                                                                                                                                                                                                                                                                                                       | token re-declarations, dots                                                                                                                             |
| `layouts/HorizontalNav`                                                                                                                                                                                       | bar                                                        | `border-b border-sidebar-border bg-sidebar` → `material-bar`; the active item reads `text-foreground` on `bg-(--material-control)`, plus a 2 px `bg-primary-indicator` underline                                                                                                                                                                                                                                                | dropdown sections, `aria-current`                                                                                                                       |
| `layouts/ContextBanner`                                                                                                                                                                                       | hard edge (opaque)                                         | none: the soft tone fill and `border-b` stay; it must stay opaque                                                                                                                                                                                                                                                                                                                                                               | `role="region"`, the sticky placement, the tone fills, the visibility on every layout (Task 12 e2e matrix, repeated with `transparency ∈ {glass, off}`) |
| `components/data/BulkActionBar`                                                                                                                                                                               | bar                                                        | `bg-card border border-border rounded-xl shadow-card` → `material-bar rounded-full` (floating toolbar), buttons capsules                                                                                                                                                                                                                                                                                                        | `role="status"`, sticky bottom                                                                                                                          |
| `components/data/data-table` sticky header (Task 23)                                                                                                                                                          | hard edge                                                  | see Task 23 amendment                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                       |
| `layouts/ThemeCustomizer` (Task 15)                                                                                                                                                                           | pane (it is a Sheet)                                       | none beyond the Sheet; tiles stay opaque (content inside a pane)                                                                                                                                                                                                                                                                                                                                                                | the radio-group semantics                                                                                                                               |
| `features/search/CommandPalette`                                                                                                                                                                              | pane (via `Command.Dialog`)                                | none                                                                                                                                                                                                                                                                                                                                                                                                                            | Cmd+K, `aria-*`                                                                                                                                         |
| Form controls (`form/*`, `ui/input`, `textarea`, `select` native)                                                                                                                                             | content (opaque wells)                                     | none; on glass `--input-fill` is re-declared opaque by the material                                                                                                                                                                                                                                                                                                                                                             | `fieldControlClass`                                                                                                                                     |
| Pages, cards, tables, StatCard, timelines, kanban                                                                                                                                                             | content (opaque)                                           | none                                                                                                                                                                                                                                                                                                                                                                                                                            | —                                                                                                                                                       |

**Scrim values:** light `black` 35%, dark `black` 55%, no blur. Stacked modals: each scrim dims what is below, so a second dialog over a sheet makes the sheet darker. That is the intended "lower modal recedes", and the order is unchanged.

**Sidebar colours and nav types (recommendation).**

- Keep all five sidebar colours as tinted glass (`material-sidebar`), with the lifted text values in 3.4.
- Keep the nav types:
  - `default`, `floating` and `boxed` use the bar material;
  - `pattern` stays an opaque band (GD8).

  No option is retired; every offered combination is in the gate.

---

## 8. Customizer

- **Stays:** layout, nav type, content width, sidebar size, mode (incl. `auto` and `black-white`), dark palette, sidebar colour, primary colour.
  - `black-white`'s `filter: grayscale(1)` is on `:root`. `:root` is the backdrop root anyway, so the materials keep working. Add one visual shot.
- **Added:** "Transparency": **Glass** (default) · **Tinted** · **Solid**. These are Apple's words (amended 2026-11-21): the iOS 27 slider runs "from ultraclear to fully tinted" (A1, A2). The stored values stay `glass | reduced | off`. There is no "ultraclear" option, because below the gate's alphas text fails (3.3).
  - Wireframe tiles, pure CSS. Each preview is a static striped panel with a frosted strip drawn as a flat colour, NOT a real backdrop filter: eight tiles would otherwise be eight filtered layers.
  - Order: after "Mode".
  - i18n `customizer.transparency.{title,glass,reduced,off}` (labels "Glass", "Tinted", "Solid") and a one-line description `customizer.transparency.hint` (amended 2026-11-21): "How see-through bars and panels are. Web pages can't read your iPhone's Liquid Glass setting, so choose here. Your system's Reduce transparency setting applies where the browser supports it."
- **Goes:** nothing.
- **Renamed label:** nav type `pattern` → "Pattern (solid)".
- **Matrix:** every option is in the gate. The colours, mode, dark palette, sidebar colour and transparency are gate axes (1,200 combinations). Layout and nav type are covered by the backdrop sets (boxed canvas, semibox gaps) and the pattern band's opaque pairs.

---

## 9. Decision log for this appendix (GD = glass decision; the owner may reverse any)

| #    | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Source                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| GD1  | Glass only on the control layer (section 1). Content stays opaque.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Apple HIG Materials                            |
| GD2  | Two recipes (bar, pane) and four utilities (`material-bar`, `material-pane`, `material-sidebar`, and `material-sidebar-bar` from GD17). No component wrapper and no SVG refraction. CLAUDE.md's "Svelte Bits GlassSurface" doctrine is replaced (Task 31).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Plan decision                                  |
| GD3  | Luminosity compression through `contrast(0.6)` in the backdrop filter. It is mode-independent, so it needs no per-mode filter tokens (`light-dark()` takes only colours).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Plan decision                                  |
| GD4  | The legibility bound treats any image as black and white, and blur as never helping. Nothing is restricted from scrolling under glass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Plan decision                                  |
| GD5  | A material fill ≥ 0.90 alpha in `glass` mode fails the gate. The fix is a lifted text token, a dim layer, or a restricted backdrop.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Plan decision                                  |
| GD6  | `--primary` returns to vivid steps for labelled fills, with a dark label where white fails. `--primary-text` and `--primary-indicator` take the text and mark roles. Supersedes L37 (1) for fills; L37 (2) and (3) stand.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Owner direction + plan decision                |
| GD7  | The OS Reduce Transparency, Increase Contrast and forced-colours settings override the customizer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Apple (system settings apply across the board) |
| GD8  | The `pattern` topbar stays an opaque band.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Apple tint guidance + gate numbers             |
| GD9  | Coarse pointer: panes and sidebar opaque, bar blur 12 px. No device-memory detection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Performance budget                             |
| GD10 | The scrim is dim only (35% light, 55% dark), with no blur.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Apple 35% dimming; performance                 |
| GD11 | No glass on glass: floats over an open modal surface are opaque (a `:has()` rule).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | WWDC25                                         |
| GD12 | ContextBanner, sticky table headers, typed toasts and tooltips stay opaque.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Plan decision                                  |
| GD13 | Typed date entry is restored next to the calendar (G10). Supersedes L40's "typed segments are not restored".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Owner request                                  |
| GD14 | (amended 2026-11-21) The bar material is the web form of iOS 27's automatic scroll edge effect: uniform, a defined bottom edge, one per view (topbar + horizontal nav form one). No decorative fade.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | HIG Scroll views 2026-06-08; WWDC26 278        |
| GD15 | (amended 2026-11-21) The light and black-white modes declare `color-scheme: only light`, so Safari's Adaptive Dark Mode never re-colours the gated light theme.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Safari 27.3 beta notes 2026-11-16              |
| GD16 | (amended 2026-11-21; the nav-icon half is SUPERSEDED by GD23: inactive nav icons are the muted sidebar text, the active icon and label are the accent) Menu icons are all-or-none per group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | HIG Sidebars and Menus 2026-06-08              |
| GD17 | (fix round D) The horizontal nav is the sidebar colour as a bar (`material-sidebar-bar`: the sidebar fill on the bar filter), so it follows the sidebar colour axis; the gate declares it with the sidebar text and mark tokens. The sidebar materials re-declare the SIDEBAR tokens (`--ring`, `--muted-foreground`, `--accent` ...), never the neutral page-mode ones.                                                                                                                                                                                                                                                                                                                                                                                                                                        | Review of fix C + G1-G3 (item 2, 3)            |
| GD18 | (fix round D) The body colour wash is three semantic tokens (`--page-wash-start/-end/-top`, peak opacity baked in), with dark steps of the ramp in dark mode and a lower light peak (60% on the start gradient). Page text (foreground, muted, subtle, primary-text) is gated on each at its peak, every palette x mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Review item 6                                  |
| GD19 | (fix round D) The gate models CSS filter functions in sRGB only (Filter Effects: filter-function shorthands operate in sRGB; `color-interpolation-filters` does not apply). The linearRGB branch is removed. G12 carries a device check: one bar screenshot against the gate's predicted corner colours on Chrome, Safari and Firefox. The two-corner bound also fails any text token whose luminance lies inside the backdrop interval.                                                                                                                                                                                                                                                                                                                                                                        | Review item 8                                  |
| GD20 | (fix round D) The rebuild allowlist ratchet is pinned as literals in `arch-phase2-gates.test.ts` (entries, occurrences); the JSON no longer carries a ceiling. Lower the literals when a task migrates a file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Review item 5                                  |
| GD21 | (fix round D + brand review) The logo keeps its own colours: the FRAME meets 3:1 on every surface it sits on; the CAPSULE is an accent with its own floors (1.6:1 on its surface, 1.5:1 against the frame, so the mark reads as two tones). Gated only where a logo is drawn: card, primary-soft, the sidebar layers, the topbar layer (all transparency levels), the pattern band (monochrome by design: capsule floor on the band, two-tone floor not applied). Default palette: capsule Capsule Teal 500 on opaque light surfaces, 600 on the bar (`material-bar` re-declares `--brand-capsule` / `--brand-frame` to the bar steps), 300 in dark; dark sidebars use the pack's on-dark frame (primary-400). `BrandIcon` reads `--brand-plate-*` (declared in `materials.css`) and lives in `components/ui/`. | Addendum A + review-brand-G4 findings 1-5      |
| GD22 | (controller correction after G7-G9; the owner may reverse) The sign-in card is glass ALWAYS (subject to the normal opaque fallbacks: Solid, reduced transparency, increased contrast, forced colours, print, coarse pointer). The G8 bench cost is removed at the source, not by an opaque card: the decorative backdrop marks do NOT drift (no `animation`, no keyframes; static `--primary-*` tints only). The only motion left is the marks stepping aside from the pointer, removed under `prefers-reduced-motion`. This replaces the "glass only under reduced motion" rule of G8 (and the "falls back to opaque if the bench fails" clause of section 5). Budget: the card is the one filtered layer on `/signin` (fine pointer), none on touch.                                                          | Controller review of G7-G9                     |
| GD23 | (fix round G; supersedes the nav-icon half of GD16 and the "opaque" `--sidebar-accent` of the glass plan) A selected nav item is marked by SHAPE and colour: a 3px inline-start indicator bar (`--sidebar-indicator`, gated at 3:1 on the sidebar and on the chip) plus a translucent supporting tint (`--sidebar-accent`, floor 1.1 against the sidebar composite) and the accent icon and label (`--sidebar-accent-foreground`, 4.5:1 on the chip composite). Inactive icons are the muted sidebar text (`--sidebar-icon`). Under forced colours the bar is drawn in `Highlight`.                                                                                                                                                                                                                             |
| GD24 | (fix round G) An impossible typed date is an error, never adjusted: `31 / 02 / 2026` stays as typed, the field is invalid with "This date does not exist" and emits no value; a year with fewer than four digits is not a value; a year outside `minYear`..`maxYear` is invalid. Picking in the calendar always yields a real date. The date fields own their segments (`utils/typed-date.ts`); bits-ui is kept for the calendar only.                                                                                                                                                                                                                                                                                                                                                                          |

**Amended Phase 2 global constraint (§0 "Opaque tokens in regenerated files (L37)").** Anything that carries contrast uses an opaque semantic token, OR a material utility (`material-bar|pane|sidebar|sidebar-bar`) whose composite the gate proves. `bg-scrim` is the only other alpha. No `/<alpha>` on text, ring, `border-input` or solid fills. Remove "only the pinned decorative scrim `bg-black/50` is allowed".

---

## 10. Tasks

Per-task test cadence is as in the Phase 2 plan §0 (fast checks only). The full suites run in G12. Commit subjects use the repo's `type(scope): sentence` style and end with the session's attribution trailer.

### Task G1: Primary roles — vivid fills, `--primary-text`, `--primary-indicator`; lifted sidebar text

**Files:**

- Modify:
  - `src/styles/theme/semantic.css`: rename `--primary-solid` → `--primary-fill` per colour block (values from 6.1). Add `--primary-fill-foreground`, `--primary-hover-toward`, `--primary-text`, `--primary-indicator` and `--primary-indicator-foreground` per block. Set `--primary`, `--primary-foreground` and `--primary-hover` as in 6.1. Apply the `--sidebar-foreground` lifts (3.4) and the opaque `--sidebar-accent` (6.2). (amended 2026-11-21) Add `--sidebar-icon: var(--sidebar-foreground)`, with `:root[data-sidebar-colors='light'] { --sidebar-icon: var(--primary-indicator); }`, bridged as `--color-sidebar-icon`. Add the opaque gate pair `sidebar-icon / sidebar` (3). The material pair is in G3.
  - `src/styles/tokens.css`: bridge `--color-primary-text`, `--color-primary-indicator`, `--color-primary-indicator-foreground`.
  - `src/styles/base.css`: `::selection` stays.
  - `scripts/shadcn/normalize.mjs`:
    - `text-primary` → `text-primary-text` (bare only);
    - an `INDICATOR_BY_FAMILY` map (checkbox, radio-group, switch, slider, progress, tabs) for `bg-primary` / `border-primary` / `text-primary-foreground` → indicator tokens;
    - `hover:text-primary-hover` → `hover:underline`.
  - `src/lib/components/ui/CUSTOMIZATIONS.md`: record the rewrites.
  - The ~40 call sites of bare `text-primary` in `src/` (count at `886a7922`: 40 in 24 files). Run the normaliser's rule as a one-off codemod over `src/lib/**` and `src/routes/**`.
  - `scripts/arch/check-token-contrast.mjs`: the pair changes in 6.1.
  - `scripts/arch/check-tokens.mjs`: rule (m5).
  - `tests/e2e/fixtures/tokens-light-leadkart.json`: the parity probe values for `--primary` and the sidebar text (list each changed value in the commit body).
- Test:
  - `tests/unit/contract/arch-token-contrast.test.ts` (extend);
  - `tests/unit/scripts/shadcn-normalize.test.ts` (extend);
  - `tests/unit/contract/arch-tokens.test.ts` (extend).

- [ ] **Step 0: Re-baseline.** Confirm Tasks 15 and 16 are merged: `git log --oneline -5`. `rg -n "glass" src/styles` must show only comments. Task 16 deletes the `--glass-*` tokens, and its rule (a) bans the `glass-` names, which is why this appendix uses `material-`. If `src/styles/base.css` still has the `prefers-reduced-transparency` block with `--glass-*`, delete it in G2, not here.
- [ ] **Step 1: Write the failing tests.**
  - Gate fixture: a palette whose `--primary-fill` is step 500 lime with a white foreground fails `primary-foreground on primary`. With the 950 foreground it passes.
  - `primary-indicator / muted` < 3 fails.
  - The normaliser maps `data-checked:bg-primary` in `checkbox/x.svelte` to `data-checked:bg-primary-indicator`, and leaves `bg-primary` in `button/x.svelte` alone.
  - `check-tokens` flags `class="text-primary"` and accepts `text-primary-text` and `text-primary-foreground`.
  - Run: `npx vitest run tests/unit/contract/arch-token-contrast.test.ts tests/unit/scripts/shadcn-normalize.test.ts tests/unit/contract/arch-tokens.test.ts`. Expected: FAIL.
- [ ] **Step 2: Implement the tokens, the normaliser rules and the codemod.** Re-run `node scripts/shadcn/normalize.mjs` over `src/lib/components/ui/**` and diff: only the intended rewrites.
- [ ] **Step 3: Run the gates.** `node scripts/arch/check-token-contrast.mjs && npm run arch:check && npm run check`. Expected: PASS. Where orange 600 + white reports < 4.5, switch orange to 500 + 950 per 6.1, and note it in the commit body.
- [ ] **Step 4: Run the e2e.** `npm run build && CI=1 npx playwright test tests/e2e/tokens-parity.spec.ts tests/e2e/customizer.spec.ts tests/e2e/a11y.spec.ts --project=chromium --retries=0`. Expected: PASS.
- [ ] **Step 5: Commit.** `fix(tokens): the primary colour fills at its vivid step with a dark label where white fails; links and marks get their own readable tokens (primary-text, primary-indicator); sidebar text lifted for glass`

### Task G2: Material tokens, fallbacks, utilities, scrim; `check-tokens` material rules

**Files:**

- Create:
  - `src/styles/theme/materials.css` (section 2.3);
  - `src/styles/theme/materials-fallbacks.css`;
  - `tests/unit/styles/materials.test.ts`.
- Modify:
  - `src/styles/index.css`: import both new files after `semantic.css`.
  - `src/styles/utilities.css`: the three `@utility material-*` blocks and the no-glass-on-glass rule. (amended 2026-11-21) There is no scroll-edge `::after` and no `--material-edge-fade`: the bar is the scroll edge effect (GD14). `materials.test.ts` asserts that `--material-edge-fade` is not declared.
  - `src/styles/tokens.css`: `--color-scrim`.
  - `src/styles/base.css`: delete the stale `prefers-reduced-transparency` block (its `--glass-*` and `--lk-muted-tint*` are replaced by `materials-fallbacks.css`), and update the body-wash comment.
  - `scripts/arch/check-tokens.mjs`: rules (m1)–(m4), `ALLOWED_ALPHA = new Set()`.
  - `tests/unit/contract/arch-tokens.test.ts`.

- [ ] **Step 1: Write the failing tests.**
  - `materials.test.ts` parses the two CSS files (string parse, no browser).
    - Every `--material-*-fill` in `:root` is `color-mix(in srgb, var(--card|--popover|--sidebar) N%, transparent)` with N < 90.
    - The `off` block declares an opaque value for every fill and `none` for every filter.
    - Each of the six fallback blocks (`@supports not`, reduced-transparency, contrast, forced-colors, print; coarse covers the pane subset) contains every declaration of the `off` block with the identical value.
    - `materials.css` has no `@media`, no nesting and no selector other than `:root` / `:root[data-…]`.
  - `arch-tokens.test.ts`:
    - `backdrop-blur-sm` in a `.svelte` file fails;
    - `backdrop-filter:` in `src/lib/layouts/X.svelte` `<style>` fails, and in `utilities.css` passes;
    - `bg-black/50` fails;
    - `--material-bar-fill:` declared in a component fails;
    - `will-change: transform` in a component fails.
  - Run: `npx vitest run tests/unit/styles/materials.test.ts tests/unit/contract/arch-tokens.test.ts`. Expected: FAIL.
- [ ] **Step 2: Implement.** Check the built CSS: `npm run build` and `rg -n "backdrop-filter" .svelte-kit/output/client/_app/immutable/assets/*.css`. Both the prefixed and the unprefixed property must be present, and the `var()` must be kept (Lightning CSS must not drop it). If Lightning CSS drops the `-webkit-` copy, keep both declarations literally in the `@utility` (they are). Record the finding in the commit body.
- [ ] **Step 3: Fast checks.** `npm run check && npm run arch:check && npm run lint:css`. Expected: PASS. Nothing consumes the utilities yet, so the rendering is unchanged except for the scrim (no blur, 35% / 55%).
- [ ] **Step 4: Commit.** `feat(tokens): Liquid Glass materials — bar and pane recipes, sidebar tint, scoped glass-safe text tokens, opaque fallbacks for reduced transparency, contrast, forced colours, print and no-support; dim-only scrim`

### Task G3: Contrast gate v2 — materials over worst-case backdrops

**Files:**

- Create:
  - `scripts/arch/lib/material-bound.mjs`: the saturate matrix, envelope corners, contrast map and composite (pure functions, exported for tests).
- Modify:
  - `scripts/arch/check-token-contrast.mjs`:
    - `FILES` adds `src/styles/theme/materials.css`;
    - `AXES.transparency`, `ATTRIBUTE_FOR.transparency = 'data-transparency'`;
    - `export const MATERIAL_LAYERS` (section 3.2);
    - the material loop;
    - the "not glass" rule;
    - a `--needs` flag that prints, per layer and mode, the minimum alpha each text token needs (informational, for tuning).
  - `scripts/arch/check-token-contrast.d.mts`: types.
  - `tests/unit/contract/arch-token-contrast.test.ts`.

**Interfaces:**

```js
/** @typedef {{ layer: string, fill: string, saturate: string, contrast: string,
 *   backdrops: Array<string | '#000' | '#fff'>, under?: string,   // `under`: a scrim token composited over each backdrop first
 *   text: string[], marks: string[], onControl?: { control: string, text: string[] } }} MaterialLayer */
export const MATERIAL_LAYERS; // topbar, hnav, bulk-bar, sidebar-desktop, sidebar-mobile, overlay, float, auth-card
export function corners(backdrops, saturate, contrast); // -> rgb[4]: lo/hi in sRGB-encoded and linearRGB saturate
export function checkMaterials(props, mode, combo); // -> problems[]
```

- [ ] **Step 1: Write the failing self-tests** (fixtures written as CSS strings, like the existing gate tests).
  1. **Too transparent fails.** A bar fill at 40% fails `material-muted-foreground` with a message naming the layer, the mode and the ratio.
  2. **Not glass.** A pane fill at 92% in `glass` fails with the "is not glass" message, even though every ratio passes.
  3. **The saturate bound bites.** A backdrop set `{#0000ff, #ffffff}` with `saturate(2)` produces a darker corner than without saturate. A fixture that passes at `saturate(1)` fails at `saturate(2)`.
  4. **Compression helps.** The same fill passes at `contrast(0.6)` and fails at `contrast(1)`.
  5. **Off is opaque.** With `data-transparency='off'` every material pair equals the corresponding opaque pair. Prove it by comparing ratios to `pairRatio` with no alpha.
  6. **Missing tokens fail.** A missing `--material-pane-saturate` fails, never skips.
  7. **Under-scrim.** In dark mode, the overlay layer with `--scrim` 55% needs a lower alpha than without the scrim.
     7a. (amended 2026-11-21) **The sidebar icon mark.** With `sidebarColors=light`, `sidebar-icon` (= `primary-indicator`) is checked at 3:1 over both sidebar layers. A fixture whose indicator is the vivid lime 500 fails on the light sidebar composite.
  8. The real repo files pass.
  - Run: `npx vitest run tests/unit/contract/arch-token-contrast.test.ts`. Expected: FAIL on 1–7.
- [ ] **Step 2: Implement.** Tune ONLY `materials.css` or text tokens if the real files fail. Never weaken a layer's backdrop set.
- [ ] **Step 3: Run the gate.** `node scripts/arch/check-token-contrast.mjs` and `--needs`. Expected: PASS, roughly 1,200 combinations. Paste the `--needs` table for the default palette into the commit body; it should match section 3.3 within ±0.01.
- [ ] **Step 4: Commit.** `feat(arch): the contrast gate proves text on glass — each layer's material composited over the darkest and lightest backdrop it can have (saturate bound, luminosity compression), a transparency axis, and a "not glass" limit`

### Task G4: Transparency preference (ninth axis) + customizer group

**Files:**

- Modify:
  - `src/lib/features/preferences/schema.ts`: `transparency: ['glass', 'reduced', 'off']`, default `glass`, attribute `data-transparency`, the schema field.
  - `src/lib/layouts/customizer-config.ts`: the group after `mode`, `kind: 'wireframe'`.
  - `src/lib/layouts/CustomizerTile.svelte`: `data-preview="transparency-*"` wireframes (static CSS, no backdrop filter).
  - `src/lib/i18n/locales/en.json`: the `customizer.transparency.*` keys (English only, L46). (amended 2026-11-21) The labels are "Glass", "Tinted" and "Solid", and the hint is the section 8 text (it says the iPhone slider does not reach web pages). Add a `customizer-config.test.ts` assertion that the three label keys resolve to those strings.
- Test:
  - `tests/unit/features/preferences/*.test.ts`: codec round trip; an old cookie without the field decodes to `glass`; `"transparency":"<script>"` falls back; the encoded cookie with every field at its longest value is ≤ 300 bytes.
  - `tests/unit/layouts/customizer-config.test.ts`: one group per key.
  - `tests/unit/server/html-shell.test.ts`: `data-transparency` appears in the `<html>` tag.
  - `tests/e2e/preferences-ssr.spec.ts`: `page.request.get('/dashboard')` with the cookie set to `off` contains `data-transparency="off"`.
  - `tests/e2e/customizer.spec.ts`: pick "Off" → `<html data-transparency="off">` with no reload, and the computed `backdrop-filter` of `[data-shell=topbar]` is `none` (after G6; until then assert only the attribute).

- [ ] **Step 1: Write the failing tests** above. Run the unit tests. Expected: FAIL.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Run the e2e.** `npm run build && CI=1 npx playwright test tests/e2e/preferences-ssr.spec.ts tests/e2e/customizer.spec.ts --project=chromium --retries=0`. Expected: PASS.
- [ ] **Step 4: Commit.** `feat(prefs): a Transparency preference (glass, reduced, off) written to <html> at SSR; customizer group`

### Task G5: Overlay primitives on the pane material (normaliser)

**Files:**

- Modify:
  - `scripts/shadcn/normalize.mjs`:
    - a `MATERIAL_BY_FAMILY` map:
      - dialog, alert-dialog, sheet, popover, dropdown-menu, select: `bg-popover` → `material-pane`; drop `shadow-md|shadow-lg`, `ring-1`, `ring-border`;
      - overlays: `bg-black/50` and `supports-backdrop-filter:backdrop-blur-xs` → `bg-scrim`;
      - popover-family `rounded-lg|rounded-md` on the content → `rounded-xl`; items `rounded-sm|rounded-md` → `rounded-lg`;
    - command: the root `bg-popover` → `bg-transparent` when inside `command-dialog`.
  - The regenerated files it touches under `src/lib/components/ui/{dialog,alert-dialog,sheet,popover,dropdown-menu,select,command,sonner}/`.
  - `src/lib/components/ui/sonner/sonner.svelte` (hand edit, recorded).
  - `src/lib/components/ui/CUSTOMIZATIONS.md`.
- Test:
  - `tests/unit/scripts/shadcn-normalize.test.ts`: each family mapping, idempotence (run twice gives the same output).
  - `tests/unit/components/stacked-modals.test.ts`, `busy-veto-bound`, `sheet-busy`, `drawer-busy`, `pending-dismissal`: unchanged and green.
  - New: `tests/unit/components/material-surfaces.test.ts`. Mount Dialog, Sheet, Popover and DropdownMenu open:
    - each content element has class `material-pane` and no `bg-popover`;
    - each overlay has `bg-scrim`;
    - the dialog content still has `z-(--z-modal)`.
  - (amended 2026-11-21) `tests/unit/components/menu-icons.test.ts`: mount UserMenu (and, once they exist, RowActionsMenu and the DataTable column menu). Within each `[role=group]` or separator-delimited run of `[role=menuitem]`, either every item contains an `svg` or none does (A10).

- [ ] **Step 1: Write the failing tests.** Run them. Expected: FAIL.
- [ ] **Step 2: Implement.** Run the normaliser over the families, then review the diff by hand: only class changes. Make UserMenu's groups uniform (amended 2026-11-21).
- [ ] **Step 3: Run the e2e.** `npm run build && CI=1 npx playwright test tests/e2e/customizer.spec.ts tests/e2e/cmd-k-search.spec.ts tests/e2e/permission-requests.spec.ts --project=chromium --retries=0`. Expected: PASS.
- [ ] **Step 4: Commit.** `feat(ui): dialogs, sheets, popovers, menus, selects, the command palette and neutral toasts on the pane material; dim-only scrim; no glass on glass`

### Task G6: Shell on materials

**Files:**

- Modify:
  - `src/lib/layouts/Topbar.svelte`;
  - `src/lib/layouts/HorizontalNav.svelte`;
  - `src/lib/components/ui/sidebar/sidebar.svelte` (hand edit, recorded);
  - `src/lib/components/ui/sidebar/sidebar-menu-button.svelte` (active state);
  - `src/lib/components/data/BulkActionBar.svelte`;
  - `src/lib/components/ui/AuthCard.svelte`;
  - `src/styles/theme/layouts.css` (amended 2026-11-21):
    - no scroll-edge `::after` (GD14);
    - `:root[data-layout='horizontal'] [data-shell='topbar']` drops the outer edge from its box-shadow, so the topbar and hnav form one scroll edge effect, with the hnav carrying the bottom edge;
    - the pattern band gets `backdrop-filter: none; box-shadow: none`;
    - the semibox topbar's `border` is removed (the material edge replaces it).
  - `src/lib/layouts/NavItem.svelte` (amended 2026-11-21): icons `text-sidebar-icon` (GD16).
  - `src/lib/components/ui/CUSTOMIZATIONS.md`.
- Test:
  - `tests/unit/components/topbar.test.ts` (or the existing shell test): the header has `material-bar`, and the search trigger keeps its `aria-label`.
  - `tests/unit/components/tenant-context-banner.test.ts`: the banner has no `material-*` class (pin GD12).
  - `tests/e2e/tenant-context-banner.spec.ts`: run its existing layout matrix twice, `transparency ∈ {glass, off}` (cookie). The banner is visible, Tab reaches Exit, and Exit lands on `/operator/tenants`.
  - `tests/e2e/shell-layouts.spec.ts`: in each of the 5 layouts with `glass`, `[data-shell=topbar]` has a computed `backdrop-filter` containing `blur(`. With `navType=pattern` it is `none`. (amended 2026-11-21) In `horizontal`, the topbar's computed `box-shadow` has no outer 1 px edge and `[data-shell=hnav]` has one. No `[data-shell=topbar]::after` has `content` other than `none`. With `sidebarColors=light`, a NavItem icon's computed colour equals `--primary-indicator`.

- [ ] **Step 1: Write the failing tests.** Run them. Expected: FAIL.
- [ ] **Step 2: Implement** per the section 7 rows.
- [ ] **Step 3: Run the gates and the e2e.** `node scripts/arch/check-token-contrast.mjs && npm run arch:check`, then `npm run build && CI=1 npx playwright test tests/e2e/tenant-context-banner.spec.ts tests/e2e/shell-layouts.spec.ts tests/e2e/role-aware-shell.spec.ts tests/e2e/operator-impersonation.spec.ts --project=chromium --retries=0`. Expected: PASS.
- [ ] **Step 4: Commit.** (amended 2026-11-21) `feat(shell): glass topbar and horizontal nav as one scroll edge, sidebar (five tinted glasses, accent icons on the light one), floating bulk bar and auth card; the tenant banner stays opaque on every layout`

### Task G7: Shape language — radii, capsules, edges, type weights on glass

**Files:**

- Modify:
  - `src/lib/components/ui/button/button.svelte`: radius per Q1. Default `rounded-full` for every size except `link`; `icon` sizes `rounded-full`.
  - `src/lib/components/ui/card/card.svelte`: delete `surface="glass"`.
  - `src/lib/features/dashboard/components/{PlatformDashboard,TenantAdminDashboard,TenantUserDashboard}.svelte`: drop `surface="glass"`.
  - The dropdown, select and command item classes (`rounded-lg`, `font-medium` for item labels).
  - `src/lib/components/ui/CUSTOMIZATIONS.md`.
- Test:
  - `tests/unit/components/button.test.ts`: the default size has `rounded-full`, and the link variant has no radius class.
  - `tests/unit/contract/arch-ui-boundaries.test.ts` or a grep test: no `surface="glass"` in `src/`.

- [ ] **Step 1: Write the failing tests.** Run them. Expected: FAIL.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Fast checks**, plus `CI=1 npx playwright test tests/e2e/a11y.spec.ts --project=chromium --retries=0`.
- [ ] **Step 4: Commit.** `feat(ui): Liquid Glass shape language — capsule controls, concentric radii on floating surfaces, medium-weight labels on glass`

### Task G8: Performance budget — layer counter (hard), scroll bench (annotation), size

**Files:**

- Create:
  - `tests/e2e/material-budget.spec.ts`;
  - `tests/e2e/material-scroll.perf.spec.ts`;
  - `tests/e2e/helpers/materials.ts`: `countFilteredLayers(page)` and `hasFixedDescendant(page)`.
- Modify:
  - `playwright.config.ts`: `material-scroll.perf.spec.ts` runs only in the chromium project, as `@perf` (`grep`).
  - `.size-limit` config: no change. Record the figures.

**Interfaces:**

```ts
export async function countFilteredLayers(
	page: Page
): Promise<{ total: number; overScroll: number }>;
// evaluate: every element whose getComputedStyle(el).backdropFilter !== 'none'; overScroll = those whose
// fixed/sticky box intersects the scrolling document (topbar, hnav, bulk bar)
export async function hasFixedDescendant(page: Page): Promise<string[]>; // material elements containing a position:fixed descendant
```

- [ ] **Step 1: Write the budget spec.** Use the states and limits in section 5. Run it with transparency `glass`, at 1280 × 800 fine pointer and 390 × 844 touch.
- [ ] **Step 2: Write the perf spec.** Annotate (`test.info().annotations`) p95 and the slow-frame share for glass vs off on `/data-table-bench` and `/signin`. Apply the soft assertion in section 5. If `/signin` fails, apply the auth-card fallback (section 5) in this task.
- [ ] **Step 3: Run.** `npm run build && CI=1 npx playwright test tests/e2e/material-budget.spec.ts tests/e2e/material-scroll.perf.spec.ts --project=chromium --retries=0`, then `npm run size`. Expected: PASS. CSS gzip within 60 KB, and the delta against the Task 17 figure recorded.
- [ ] **Step 4: Commit.** `test(perf): a filtered-layer budget per state and viewport, no fixed descendants inside glass, and a throttled scroll bench glass vs off`

### Task G9: Accessibility matrix and visual shots

**Files:**

- Modify:
  - `tests/a11y/routes.spec.ts`: the light/dark loop becomes `mode × transparency ∈ {glass, off}` (cookie).
  - `tests/e2e/a11y.spec.ts`: add emulations.
  - `tests/visual/routes/nav.visual.spec.ts` and `customizer.visual.spec.ts`, which Task 30 creates. Add the shots below to Task 30's matrix if it has not run yet.
- Create:
  - `tests/e2e/material-fallbacks.spec.ts`.
  - (amended 2026-11-21) `tests/e2e/fixtures/material-probe.html`, the device probe for G12. It is a static file that links the built CSS and contains no script except a nonce-free external `material-probe.js` next to it, which prints the three `matchMedia` results. It lives under `tests/` only and is never served by the app; the owner opens it from `npx vite preview` or `python -m http.server` on the LAN.

`material-fallbacks.spec.ts` (Chromium; emulation through CDP `Emulation.setEmulatedMedia`, Playwright `emulateMedia`):

1. `prefers-reduced-transparency: reduce` with the cookie at `glass`: the topbar, an open dialog and the sidebar have `backdrop-filter: none`, and their background alpha is 1.
2. `prefers-contrast: more`: as 1, plus the dialog's computed `box-shadow` contains the `--input` colour.
3. `forcedColors: 'active'`: the dialog has a 1 px solid border and an opaque background.
4. Print (`emulateMedia({ media: 'print' })`): no backdrop filter.
5. `hasTouch` + `isMobile`: an open sheet has `backdrop-filter: none`, and the topbar has `blur(12px)`.
6. `reducedMotion: 'reduce'`: opening a dialog produces no running animations (`document.getAnimations().length === 0` after open).

Axe: run on `/dashboard` and `/settings/users` with the customizer open and with a dialog open, for light/dark × glass/off. Expected: zero serious or critical findings.

**Visual shots for human review** (scratchpad, not committed, unless Task 30's baselines exist; then add them):

- `/dashboard` 1280 and 390, light and dark, glass / reduced / off;
- `/settings/users` with the topbar over a scrolled list (scroll 600 px);
- the sidebar in each of the 5 colours, light and dark;
- semibox and boxed layouts with glass;
- the `pattern` band;
- a FormSheet with a Select open (shows the opaque nested float);
- the command palette;
- the user menu;
- a toast of each type;
- `/signin` light and dark;
- `black-white` mode;
- forced colours.

Compare against Apple's look (frosted, dark text) and against Domiex geometry. Report the differences.

- [ ] **Step 0 (amended 2026-11-21): Opt out of Safari's Adaptive Dark Mode (GD15).**
  - In `src/styles/theme/semantic.css` (the only file allowed to set `color-scheme`):
    - `:root { color-scheme: only light; }`;
    - `:root[data-mode='black-white'] { color-scheme: only light; }`;
    - `dark` stays `dark`, and `auto` stays `light dark`.
  - Verify the build first: `npm run build`, then inspect the emitted CSS. Lightning CSS must still lower every `light-dark()` correctly with `only light`, so that light values render in light mode and dark values in dark mode. Run `tests/e2e/tokens-parity.spec.ts` in both modes.
  - If Lightning CSS mishandles `only`, fall back to the equivalent `<meta name="color-scheme" content="only light">`. It must be written per request by `htmlShellHandle` only when the mode is light or black-white, with no inline script, so it is CSP-neutral. Note which route was taken in the commit body.
  - Test: `tests/e2e/preferences-ssr.spec.ts` asserts that `getComputedStyle(document.documentElement).colorScheme` is `only light` for `mode=light` and `light dark` for `mode=auto`.
  - `check-token-contrast`'s parser ignores `color-scheme` (it reads custom properties only); confirm that its self-tests still pass.
- [ ] **Step 1: Write the specs.** Run them. Expected: FAIL only where a fallback is missing; fix in `materials-fallbacks.css`.
- [ ] **Step 2: Run.** `npm run build && CI=1 npx playwright test tests/e2e/material-fallbacks.spec.ts --project=chromium --retries=0 && CI=1 npx playwright test --project=a11y --retries=0`. Expected: PASS.
- [ ] **Step 3: Commit.** `test(a11y): reduced transparency, increased contrast, forced colours, print, touch and reduced motion resolve glass to opaque; axe on glass and off in both modes`

### Task G10: DatePicker and DateRangePicker — typed entry plus calendar popover

> **Superseded by GD24 (fix rounds G and H).** The segments are hand-written (`ui/date-field`: `date-field-input`, `date-field-segment`, `date-field-label`; the rules are pure functions in `src/lib/utils/typed-date.ts`). There are no bits-ui `DateField` / `DateRangeField` wrappers and no `date-range-field/` folder: bits-ui is used for the calendar only. Read the file list below as history.

**Files:**

- Create:
  - `src/lib/components/ui/date-field/{date-field.svelte,date-field-input.svelte,date-field-segment.svelte,date-field-label.svelte,index.ts}`;
  - `src/lib/components/ui/date-range-field/{date-range-field.svelte,date-range-field-input.svelte,index.ts}` (segments reused).

  These are thin, styled wrappers of bits-ui 2.21 `DateField` / `DateRangeField`. First try `npx shadcn-svelte@1.8 add date-field` (and `range-date-field`). If the registry has none, hand-write them and list them in `CUSTOMIZATIONS.md` under the non-CLI composites. bits-ui is imported only under `ui/` (Task 7 gate).
  - `src/lib/utils/date-only.ts`: `toDateOnly(v: DateValue | undefined): string` (`''` when undefined) and `fromDateOnly(s: string): CalendarDate | undefined` (`parseDate`, `undefined` on bad input). Never `Date#toISOString`.

- Modify:
  - `src/lib/components/form/DatePicker.svelte` and `DateRangePicker.svelte`: rebuilt, same props plus `valueString`/`onValueStringChange` (below).
  - `src/lib/i18n/locales/en.json`: `form.datePicker.openCalendar` ("Open calendar, {label}"), `form.datePicker.incomplete` ("Enter a complete date"), `form.dateRangePicker.start` / `.end`.
  - `src/routes/(dev)/styleguide/Fields.svelte`.
  - Phase 2 plan L40: add "superseded by GD13".

**Anatomy (DatePicker):**

```
Field.Field
  DateField.Label (bits label; Field.Label classes; labels the segment group)
  div.fieldControlClass (the frame; focus-within ring)
    DateField.Root bind:value bind:placeholder {minValue} {maxValue} {locale} granularity="day"
      DateField.Input (role=group, aria-describedby = error id then hint id, aria-invalid, aria-required)
        {#each segments}<DateField.Segment part={…}/>{/each}   (dd / mm / yyyy order from locale)
    Popover.Root bind:open
      Popover.Trigger (Button ghost icon-sm, aria-label = $_('form.datePicker.openCalendar', {label}))
      Popover.Content align="end" (material-pane via G5)
        Calendar type="single" bind:value bind:placeholder captionLayout="dropdown" {years}
  input type=hidden {name} value={toDateOnly(value)}   (when `name`)
  Field.Description (hint) · Field.Error (error)
```

The ONE `value` (and `placeholder`) is bound to both the segments and the calendar. Typing updates the calendar month. Picking a day fills the segments, closes the popover and returns focus to the trigger (bits default).

The DateRangePicker is the same with `DateRangeField` (start and end inputs, `type="start" | "end"`, each segment group labelled `{label} — start` / `end` through the `form.dateRangePicker.*` keys) and `RangeCalendar`. The popover closes when both ends are set.

**Keyboard** (bits DateField; verify against the installed 2.21 docs in Step 1 and correct this list if it differs):

- Tab reaches the first segment. Left and Right move between segments; Tab leaves the group toward the calendar button.
- Up and Down step the focused segment. Digits type, and auto-advance when the segment is full. Backspace clears the segment.
- **Alt+ArrowDown** on any segment opens the calendar (a local `onkeydown` on `DateField.Input`, like native date inputs). Escape closes it.
- In the grid, bits handles the arrows, Enter/Space and Escape. PageUp/PageDown and Home/End are still not implemented by bits (documented, as today).

**Validation and errors.**

- The form owns validation (Zod on the date-only string).
- The component reports **incomplete** entry. When the group loses focus with some but not all segments filled, it calls `onIncomplete?.()`. If the caller passes no `error`, it shows `form.datePicker.incomplete` as its own error and sets `aria-invalid`.
- `minValue` / `maxValue` keep bits' `data-invalid`, mapped to `aria-invalid="true"`.
- L39 holds: `Field.Error` has no live role, the error id comes before the hint id in `aria-describedby`, and `focusFirstInvalid` finds `[aria-invalid="true"]` on the group and focuses its first `[tabindex]:not([tabindex="-1"])` descendant (the first segment). Verify that bits gives segments `tabindex="0"`.

**Value format.**

- `value: DateValue | undefined` stays (bindable).
- New optional `valueString` / `onValueStringChange` carry the date-only `YYYY-MM-DD` (`CalendarDate#toString()`). The hidden input uses the same.
- No time-zone conversion anywhere: `toDate(getLocalTimeZone())` is used only to FORMAT a display string, never to transport.
- `granularity="day"` with a `CalendarDate` placeholder, so no time segments appear.

- [ ] **Step 1: Write the failing tests** in `tests/unit/components/date-pickers.test.ts` (extend; keep today's assertions that still apply) and `tests/unit/utils/date-only.test.ts`:
  - typing `1`, `0`, `0`, `5`, `2`, `0`, `2`, `6` into the segments (en-IN `dd/mm/yyyy` order through `locale="en-IN"`) sets `value.toString() === '2026-05-10'` and the hidden input to `2026-05-10`;
  - the calendar opened afterwards shows May 2026 with the 10th selected;
  - picking a day in the calendar fills the segments and closes the popover;
  - Alt+ArrowDown on a segment opens the popover;
  - blurring after typing only the day calls `onIncomplete`, shows the incomplete error, and the group has `aria-invalid="true"`;
  - with `error` passed, `aria-describedby` starts with the error id;
  - `focusFirstInvalid(form)` focuses the first segment;
  - `date-only`: with `process.env.TZ = 'Asia/Kolkata'` and again with `'America/Los_Angeles'` (set at the top of the file before any `Date` use), `toDateOnly(new CalendarDate(2026, 1, 1)) === '2026-01-01'` and `fromDateOnly('2026-02-30') === undefined`;
  - DateRangePicker: typing both ends sets `{ start, end }`, and `start > end` is reported through `aria-invalid` (bits `validate`).

  Run: `npx vitest run tests/unit/components/date-pickers.test.ts tests/unit/utils/date-only.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement.** Arch gates: bits only under `ui/`, i18n coverage (no literal `aria-label`), RTL-safe utilities.
- [ ] **Step 3: Run the checks.** `npm run check && npm run arch:check && CI=1 npx playwright test tests/e2e/a11y.spec.ts --project=chromium --retries=0` (the styleguide fields are covered by a11y). Expected: PASS.
- [ ] **Step 4: Commit.** `feat(form): DatePicker and DateRangePicker take typed dates (segments) and keep the calendar with month and year dropdowns; date-only values with no time-zone shift`

### Task G11: Docs and plan amendments

**Files:**

- Modify:
  - `docs/superpowers/plans/2026-11-20-phase-2-ui-foundation.md`:
    - add GD1–GD13 to §3 (or a new §3.1 "Appendix G decisions");
    - amend §0 per section 9;
    - mark L40 superseded and L37 (1) revised;
    - add the Task 18–32 amendments below to each task;
    - §4.5 gains the material layers;
    - §7 inserts G1–G12 between 17 and 18.
  - `src/lib/components/ui/CUSTOMIZATIONS.md`: confirm every G edit is listed.

  CLAUDE.md is Task 31's: add to Task 31 Step 1 the following.
  - "Glass material = `material-bar|pane|sidebar|sidebar-bar` utilities on CSS `backdrop-filter`. No GlassSurface, Svelte Bits or SVG refraction. Content layer opaque. Text never translucent."
  - "Design discipline: Domiex is the structural reference (geometry, spacing); Apple Liquid Glass is the material reference."

- [ ] **Step 1: Edit.** Run `npx prettier --check` on the changed docs.
- [ ] **Step 2: Commit.** `docs(plan): Phase 2 adopts the Liquid Glass appendix — decisions, amended constraints, task amendments`

### Task G12: CHECKPOINT G

- [ ] **Step 1: Run the full gates.**
  - The Task 8 Step 1 commands.
  - `node scripts/arch/check-token-contrast.mjs --needs` (paste the table).
  - `npm run size` (compare with the Task 17 figures).
- [ ] **Step 2: Run the full suites.** The full chromium suite, then `--project=a11y`, then `--project=firefox --project=webkit`, the latter only for `material-fallbacks`, `shell-layouts` and `tenant-context-banner`. WebKit has no `prefers-reduced-transparency`; skip that case there with a reason.
- [ ] **Step 3: Owner checklist** (manual, real device):
  - a mid-range Android phone (Chrome, remote debugging, Performance panel): scroll `/settings/users` and an open FormSheet, and record the frame rate with glass and off;
  - an iPhone (Safari): the frosted topbar and dark text. Then turn on Settings › Accessibility › Increase Contrast and record whether the materials turn opaque (that is, whether Safari reports `prefers-contrast: more` for that switch; this could not be verified, see section 12);
  - Windows with "Transparency effects" off: the materials are opaque.
  - (amended 2026-11-21) **The owner's own iPhone on iOS 27.** Report back each item with a screenshot.
    1. **Reference look in system UI.** Open each of these with light content behind it and then dark content behind it, in light and in dark appearance:
       - Control Centre;
       - Settings › General (a list with a large title, scrolled so content passes under the top bar);
       - Mail or Files with a toolbar over a scrolled list;
       - a share sheet (a sheet);
       - a long-press context menu (a menu).

       Note how frosted each is, whether the top bar has a hard bottom line or a soft fade, and whether the text stays black or white.

    2. **The Liquid Glass slider** (Settings › Display & Brightness or Appearance; note where it actually is). Record:
       - how many detents or positions it has;
       - where the default sits;
       - what the two ends look like on the Settings list and in Control Centre (one screenshot per end, plus the default).
    3. **Accessibility switches.** Turn on Settings › Accessibility › Display & Text Size › Reduce Transparency, then Increase Contrast. Screenshot the same Settings list each time.
    4. **Safari test page.** Open a page served from the dev machine. Create it at the time from `tests/e2e/fixtures/material-probe.html`, written in G9, NOT shipped: a striped background and three panels using `material-bar`, `material-pane` and `off`, plus a line printing `matchMedia('(prefers-reduced-transparency: reduce)').matches`, `matchMedia('(prefers-contrast: more)').matches` and `matchMedia('(prefers-color-scheme: dark)').matches`. Screenshot it:
       - at the slider's two ends and the default (expected: no change, since pages cannot read the slider);
       - with Reduce Transparency on (record the media-query line);
       - with Increase Contrast on (record the media-query line);
       - in dark appearance with LeadKart set to light (once Safari 27.3 ships Adaptive Dark Mode: the page must stay light).
    5. **Scroll smoothness.** Scroll `/settings/users` on the iPhone: is it smooth with glass, and is a difference from Solid visible?

- [ ] **Step 4: Report.** Counts per project, the size delta, the gate `--needs` table, the perf annotations and the screenshot list. Get owner sign-off on Q1–Q8 before Task 18 starts. (amended 2026-11-21) Attach the iPhone checklist results, and the before/after tuning of `--material-edge`, `--material-highlight` and the fills made from the owner's screenshots. Re-run the gate after any tuning.

### Amendments to Phase 2 Tasks 18–32 (G11 writes them into the plan)

| Task        | Amendment                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 18          | `FormSheet` / `FormDialog` add no surface classes: the Sheet / Dialog are already `material-pane`. Header and footer separators are `border-border` (opaque hairlines on glass). Inputs inside are opaque through the material's scoped `--input-fill`. The banner `Alert` stays opaque. Add to `form-sheet.test.ts`: the content element has `material-pane`, and no descendant has a `material-*` class (no glass on glass). |
| 19          | No change beyond 18; the `CopyButton` row uses `material-control` hover only through `ghost` Button.                                                                                                                                                                                                                                                                                                                           |
| 20          | `ConfirmDialog` on `alert-dialog`: the content is `material-pane` (G5) and the overlay `bg-scrim`. When it adds `createBusyVeto` (section 9 of the Phase 2 plan), keep the classes. `ReasonConfirmDialog`'s textarea is an opaque well. Gate pair `destructive / overlay layer` already covers the destructive confirm text.                                                                                                   |
| 21          | `ActionForm`: no surface. Tenant forms render in the content layer (opaque cards).                                                                                                                                                                                                                                                                                                                                             |
| 22          | The Domiex sign-in card is `AuthCard` (`material-pane`, G6). Do not add `bg-card`. The card's links use `text-primary-text`.                                                                                                                                                                                                                                                                                                   |
| 23          | DataTable `stickyHeader`: `thead` is the **hard edge**: `sticky top-0 z-(--z-sticky) bg-card border-b border-border`, NO material and no `backdrop-*`. The column-visibility menu is a `DropdownMenu` (pane, G5). The table body stays opaque. Row hover stays `--row-hover` (opaque). Add to the DataTable test: `thead` has no `material-*` class.                                                                           |
| 24          | The perf bench gains a `transparency` toggle (cookie), and G8's `material-scroll.perf.spec.ts` uses it. Record the annotations for glass and off next to the virtualisation numbers.                                                                                                                                                                                                                                           |
| 25          | `RowActionsMenu` is a `DropdownMenu` (pane). The destructive item reads `text-destructive` (gated on the float layer). Use `IdChip` / `BackLink` links with `text-primary-text`. (amended 2026-11-21) Menu icons are all or none per group (GD16); add RowActionsMenu to `menu-icons.test.ts`.                                                                                                                                 |
| 26          | `BulkActionBar` is `material-bar` (G6); `FilterBar` popovers are panes (G5); `SearchInput` is an opaque input in the content layer. A `ResourceListPage` toolbar that becomes sticky uses the hard edge.                                                                                                                                                                                                                       |
| 27          | `PermissionTree` checkboxes use `--primary-indicator` (G1 normaliser). `UserDetailTabs` use the tabs indicator token.                                                                                                                                                                                                                                                                                                          |
| 28          | `StatCard` and the dashboards stay opaque (content layer). `surface="glass"` is already gone (G7).                                                                                                                                                                                                                                                                                                                             |
| 29          | The checkpoint adds `check-token-contrast --needs` and `material-budget.spec.ts` to its full run, and asserts that no stable file uses `bg-black/`, `backdrop-` or bare `text-primary`.                                                                                                                                                                                                                                        |
| 30          | The visual matrix adds `transparency ×2` (reduced, off) on `/dashboard`, the G9 shot list, and the forced-colours and reduced-transparency emulations. The freeze stylesheet must NOT set `backdrop-filter: none` (it would hide the material under test). `maxDiffPixelRatio` for glass shots is ≤ 0.02 (blur is GPU-dependent). Linux baselines come from `visual-refresh.yml` as before.                                    |
| 31          | CLAUDE.md doctrine per G11 (glass = material utilities, no GlassSurface; `--primary-text` / `--primary-indicator` roles; transparency axis; layer budget; the date fields take typed entry).                                                                                                                                                                                                                                   |
| 32          | The final report adds the gate `--needs` table, the material budget results and the device checklist.                                                                                                                                                                                                                                                                                                                          |
| §9 contract | Rebuilt leads, orders and inventory pages must not add `material-*` classes in the content layer, must use `text-primary-text` for links, must use DataTable's hard-edge header, and must pass dates as date-only strings (`toDateOnly`). Fix `inventory/AddBatchDrawer`'s `toISOString().slice(0, 10)`, which shifts the date one day back east of UTC.                                                                       |

**Task sizes.**

| Task | Size | Task | Size |
| ---- | ---- | ---- | ---- |
| G1   | L    | G7   | S    |
| G2   | M    | G8   | M    |
| G3   | L    | G9   | M    |
| G4   | S    | G10  | M    |
| G5   | M    | G11  | S    |
| G6   | L    | G12  | S    |

Order: G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8 → G9 → G11 → G12. G10 is independent and may run in parallel with any task after G5, which gives its popover the material.

---

## 11. Risks, and open questions for the owner

### Risks

| Risk                                                                                                                                            | Containment                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Glass at the alphas legibility needs (72–88%) reads as "barely glass" next to Apple's own (whose alphas are unpublished)                        | The bound is deliberately worst-case (images as black and white, blur ignored). The `reduced` and `off` levels exist for the opposite preference. Tuning happens in one file, and the gate re-proves it. |
| Android jank from filtered layers                                                                                                               | Budget gate (G8), opaque panes on coarse pointer, dim-only scrim, no `will-change`, and the device checklist in G12.                                                                                     |
| Lightning CSS or Tailwind rewriting `backdrop-filter: var()` or `light-dark()` inside `color-mix`                                               | G2 Step 2 inspects the built CSS. `light-dark()` already ships through the same pipeline.                                                                                                                |
| Containing-block and backdrop-root surprises                                                                                                    | Every float is portalled. The G8 spec asserts no fixed descendants inside materials. Never put a material inside an element with opacity, filter or mask (review point).                                 |
| iOS users with Reduce Transparency get glass anyway (no Safari support)                                                                         | The customizer's Off. Q3.                                                                                                                                                                                |
| Visual baselines flaky under blur                                                                                                               | Diff ratio ≤ 0.02 for glass shots, and the same GPU path per platform (Task 30).                                                                                                                         |
| The vivid primary change surprises users (a dark label on green, teal, lime and amber buttons)                                                  | The visual shots (G9) and Q2.                                                                                                                                                                            |
| (amended 2026-11-21) Safari Adaptive Dark Mode (27.3, in beta 2026-11-16) re-colours a light-mode page that declares only `color-scheme: light` | GD15: `only light` (G9 Step 0), verified against the Lightning CSS `light-dark()` lowering, with the `<meta>` fallback.                                                                                  |
| (amended 2026-11-21) Apple's look is set by system screens the plan has not seen on the owner's device                                          | The screenshot request (below) and the G12 iPhone checklist. The edge and highlight tokens are tuned only after that.                                                                                    |
| (amended 2026-11-21) Not adopted: iOS 27 minimise-on-scroll navigation bars                                                                     | A later candidate for the phone layout. It needs a scroll listener and a layout change, so it is out of G.                                                                                               |

### Open questions (each with the default this plan executes)

1. **Q1 Capsule buttons everywhere** (not only on glass)? **Default: yes.** Every `Button` except `link` is `rounded-full`; inputs stay rounded rectangles.
2. **Q2 Dark labels on vivid green, teal, lime and amber buttons** (instead of white on a darker step)? **Default: yes.** This is the owner's "no darkening" read literally.
3. **Q3 The OS accessibility settings override the customizer's "Glass"?** **Default: yes.**
4. **Q4 Touch devices: opaque sheets, dialogs and sidebar** (glass only on the topbar, bulk bar and menus)? **Default: yes** (budget). The alternative is glass panes on phones after the G12 device check passes.
5. **Q5 (amended 2026-11-21) The brand-colour chrome options.**
   - Apple's HIG Branding (2026-09-09) calls "the brand color used in all controls" incorrect and asks for brand colour in the content layer.
   - Three options do exactly that: the `pattern` topbar band, and the `brand` and `purple` sidebar colours.
   - Keep them as selectable, never-default options (the pattern band as an opaque "Pattern (solid)"), or retire them?
   - **Default: keep** (your earlier decision that all customizer options are first-class). They stay out of every default and out of the screenshots that define the Apple look.
6. **Q6 Automatic downgrade by device memory?** **Default: no** (section 5).
7. **Q7 Default transparency level: "Glass"** (the middle of Apple's slider is reported as its default; not confirmed by Apple) or "Tinted"? **Default: Glass.** (amended 2026-11-21: label renamed from "Reduced".)
8. **Q8 Inline links and the active nav label keep a readable darker primary (`--primary-text`)**, as WCAG requires for text, while fills go vivid? **Default: yes.**

**Request to the owner (amended 2026-11-21): screenshots from your iPhone on iOS 27.** Please send 4–6 screenshots of the surfaces you want LeadKart to match, each in light AND dark appearance, with the Liquid Glass slider at the position you use:

1. A **top bar over scrolling content**: for example Settings › General scrolled halfway, or Mail's inbox scrolled, so text passes under the bar.
2. A **sidebar or grouped list**: for example Settings on iPad or Mac, or Files' sidebar. On iPhone, a Settings list works.
3. A **sheet**: for example the Share sheet or a "New event" sheet in Calendar.
4. A **menu**: a long-press context menu or a toolbar's "…" menu.
5. (optional) **Control Centre**, as your reference for the "proper liquid glass" look.
6. (optional) The **same top bar at both ends of the Liquid Glass slider**, so the Glass and Tinted levels can be matched.

These decide the tuning of `--material-edge`, `--material-highlight`, the fills and the blur radii. Those values are still press-reported or plan-chosen.

---

## 12. What could not be verified

- **(amended 2026-11-21)** This bullet is superseded by the section "iOS 27: verified against Apple's published guidance (2026-11-21)" at the top of this file. Apple has now confirmed four things:
  - the slider ("ultraclear to fully tinted"; Newsroom 2026-09-14);
  - the readability focus ("more uniform refraction and improved contrast"; App Store story);
  - the new automatic scroll edge effect (WWDC26 278; HIG Scroll views 2026-06-08);
  - the brand, sidebar-icon and menu-icon guidance (HIG 2026-06-08 and 2026-09-09).

  Still press-only: the darkened edge and the brighter specular highlights. Not found: the slider's positions and defaults, any numeric material values, and any web-observable signal for the slider.

- **Apple publishes no numeric material values** (alpha, blur radius, saturation). Every number here is this plan's, chosen to pass the gate.
- **Browser support.**
  - Whether WebKit has shipped `backdrop-filter: url()` (bug 245510) is unknown. It is moot, since refraction is not used.
  - caniuse lists `prefers-reduced-transparency` for Chrome Android only at version 157, which looks like a data artefact. Treat it as Chromium 118+, and the G9 emulation proves the CSS path either way.
  - Whether iOS Safari maps Increase Contrast to `prefers-contrast: more` was not confirmed. That is a G12 device check.
- **Cost on real hardware.** No published measurements exist of Chrome's `backdrop-filter` cost versus blur radius on mid-range Android. The budget is engineering judgement from the Firefox bug evidence, enforced by counts and checked on a device in G12.
- **The browser's colour space for `saturate()`** (sRGB-encoded or linearRGB). The gate bounds both.
- **bits-ui 2.21 DateField keyboard details** (whether Tab moves between segments, and the segment `tabindex` values). G10 Step 1 verifies them against the installed package.

## Sources

- Apple HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple HIG Color, "Liquid Glass color": https://developer.apple.com/design/human-interface-guidelines/color
- Apple HIG Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- WWDC25 "Meet Liquid Glass" (219): https://developer.apple.com/videos/play/wwdc2025/219/
- (amended 2026-11-21) Apple primary sources for iOS 27: see the URL list in the "iOS 27: verified" section at the top.
- MacRumors, "Here's How Liquid Glass Is Changing in iOS 27" (2026-06-10): https://www.macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27/
- 9to5Mac, "iOS 27 fixes Liquid Glass, and not just with a slider" (2026-06-12): https://9to5mac.com/2026/06/12/ios-27-fixes-liquid-glass-and-not-just-with-a-slider/
- 9to5Mac, the iOS 27 Liquid Glass slider (2026-06-15): https://9to5mac.com/2026/06/15/ios-27-adds-new-liquid-glass-slider-on-iphone-heres-what-it-lets-you-do/
- Filter Effects Module Level 2 (backdrop-filter, Backdrop Root): https://drafts.csswg.org/filter-effects-2/
- CSS Color Adjustment Level 1 (forced colours): https://drafts.csswg.org/css-color-adjust-1/
- MDN `prefers-reduced-transparency`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency
- caniuse `prefers-reduced-transparency`: https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency
- Aave, "Building Glass for the Web": https://aave.com/design/building-glass-for-the-web
- Mozilla bugs 1808785 (SVG filters in backdrop-filter), 1732817, 1828248, 1891831 (backdrop-filter scroll cost on Android); WebKit bug 245510.
