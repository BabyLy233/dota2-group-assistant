export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert'],
    ],
    'subject-case': [0],
    'subject-min-length': [2, 'always', 3],
    'subject-max-length': [2, 'always', 100],
  },
}
