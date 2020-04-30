import nodeResolve from 'rollup-plugin-node-resolve';
import commonJs from 'rollup-plugin-commonjs';
import typeScript from 'rollup-plugin-typescript2';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/bundle.js',
        format: 'iife',
      },
    ],
    plugins: [
      // подключение модулей node
      nodeResolve(),
      // подключение модулей commonjs
      commonJs(),
      // подключение typescript
      typeScript({ tsconfig: 'tsconfig.json' }),
    ],
  },
];
