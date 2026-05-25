import type { Preview } from '@storybook/svelte';
import '../src/app.css';

/**
 * Storybook preview — wires the global app.css (which @imports tokens,
 * base, typography, layout, animations, utilities) so every story
 * renders with the production token system and Tailwind utilities.
 *
 * `parameters.backgrounds` mirrors the canvas / elevated tokens so
 * stories can be previewed against either surface without inline
 * background hacks.
 */
const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		backgrounds: {
			default: 'canvas',
			values: [
				{ name: 'canvas', value: 'var(--color-bg)' },
				{ name: 'elevated', value: 'var(--color-bg-elevated)' },
				{ name: 'muted', value: 'var(--color-bg-muted)' }
			]
		},
		layout: 'centered',
		options: {
			storySort: {
				order: ['Foundations', 'UI', 'Form', 'Data', 'Feedback', 'Overlay', 'Navigation']
			}
		}
	}
};

export default preview;
