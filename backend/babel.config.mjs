export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
        // Convert ES modules to CommonJS for Jest
        modules: 'commonjs',
      },
    ],
  ],
};
