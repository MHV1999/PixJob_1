/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // new feature
        'fix',      // bug fix
        'docs',     // documentation
        'style',    // formatting, missing semicolons, etc.
        'refactor', // code change that neither fixes nor adds a feature
        'perf',     // performance improvement
        'test',     // adding or correcting tests
        'build',    // build system or external dependencies
        'ci',       // CI configuration
        'chore',    // other changes that don't modify src or test files
        'revert',   // reverts a previous commit
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-max-length': [2, 'always', 100],
  },
};
