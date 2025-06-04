export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  testEnvironmentOptions: {
    experimentalVmModules: true,
  },
};
