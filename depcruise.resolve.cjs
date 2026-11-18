/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS config file: dependency-cruiser loads it via require */
/**
 * dependency-cruiser resolver config (via options.webpackConfig). tsconfig.json
 * extends the generated `$app/tsconfig`, which depcruise cannot follow, so the
 * `$` aliases are fed from the shared aliases.js instead (require(esm), Node 22.12+).
 */
const path = require('node:path');
const { aliases } = require('./aliases.js');

module.exports = {
	resolve: {
		alias: Object.fromEntries(
			Object.entries(aliases).map(([key, target]) => [key, path.resolve(__dirname, target)])
		)
	}
};
