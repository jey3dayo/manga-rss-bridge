import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';

it('cleans only project output before compiling and preserves compiler exit status', () => {
  const directory = mkdtempSync(join(tmpdir(), 'manga-build-'));
  const project = join(directory, 'project');
  const script = join(project, 'scripts/build.mts');
  const staleFiles = ['__tests__/old.test.js', 'providers/old.test.js', 'fixtures/old.js'];

  try {
    mkdirSync(join(project, 'scripts'), { recursive: true });
    copyFileSync(new URL('./build.mts', import.meta.url), script);
    writeFileSync(join(project, 'package.json'), '{"type":"module"}');
    writeFileSync(join(project, 'tsconfig.json'), '{}');
    mkdirSync(join(project, 'node_modules/typescript/bin'), { recursive: true });
    writeFileSync(
      join(project, 'node_modules/typescript/bin/tsc'),
      `import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
writeFileSync('compiler.json', JSON.stringify({
  args: process.argv.slice(2), cwd: process.cwd(), staleOutput: existsSync('dist'),
}));
mkdirSync('dist', { recursive: true });
writeFileSync('dist/server.js', 'export {};');
process.exitCode = Number(process.env.FIXTURE_COMPILER_EXIT ?? 0);
`,
    );
    for (const file of staleFiles) {
      const output = join(project, 'dist', file);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, 'stale');
    }
    mkdirSync(join(directory, 'dist'));
    writeFileSync(join(directory, 'dist/keep.txt'), 'unrelated');

    const success = spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });

    expect(success.status, success.stderr).toBe(0);
    expect(JSON.parse(readFileSync(join(project, 'compiler.json'), 'utf8'))).toEqual({
      args: ['-p', join(project, 'tsconfig.json')],
      cwd: project,
      staleOutput: false,
    });
    expect(readdirSync(join(project, 'dist'))).toEqual(['server.js']);
    for (const file of staleFiles) expect(existsSync(join(project, 'dist', file))).toBe(false);
    expect(readFileSync(join(directory, 'dist/keep.txt'), 'utf8')).toBe('unrelated');

    const failure = spawnSync(process.execPath, [script], {
      cwd: directory,
      encoding: 'utf8',
      env: { ...process.env, FIXTURE_COMPILER_EXIT: '2' },
    });

    expect(failure.status, failure.stderr).toBe(2);
    expect(JSON.parse(readFileSync(join(project, 'compiler.json'), 'utf8')).staleOutput).toBe(
      false,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
