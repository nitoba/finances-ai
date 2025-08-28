import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/app.ts'],
  format: ['cjs'],
  target: 'es2022',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  minify: false,
  splitting: false,
  keepNames: true,
  external: [
    '@libsql/client',
    '@libsql/linux-x64-gnu',
    '@libsql/darwin-x64',
    '@libsql/darwin-arm64',
    '@libsql/win32-x64-msvc',
    'discord.js',
    '@discordjs/voice',
    '@discordjs/opus',
    'better-auth',
    'fastify',
    'inversify',
    'reflect-metadata',
    'drizzle-orm',
    'ai',
    '@ai-sdk/google',
    '@ai-sdk/groq'
  ],
})