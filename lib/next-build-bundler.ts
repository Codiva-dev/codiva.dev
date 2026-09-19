export function shouldUseTurbopackBuild(env: NodeJS.Dict<string> = process.env): boolean {
  return env.TURBOPACK === '1';
}

