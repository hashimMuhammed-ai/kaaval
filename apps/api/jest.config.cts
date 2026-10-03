module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleNameMapper: {
    '^@nestjs/typeorm$': '<rootDir>/src/test-utils/nestjs-typeorm-mock.ts',
    '^@nestjs/jwt$': '<rootDir>/src/test-utils/nestjs-jwt-mock.ts',
    '^@nestjs/config$': '<rootDir>/src/test-utils/nestjs-config-mock.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api'
};
