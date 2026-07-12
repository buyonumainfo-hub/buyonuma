/**
 * Loads environment variables before anything else in the app.
 *
 * WHY THIS FILE EXISTS: ES module `import` statements are hoisted — they
 * all run before any other top-level code in a file, regardless of source
 * order. That means writing `dotenv.config()` above `import authRoutes
 * from './routes/auth.js'` in index.js does NOT guarantee env vars are
 * loaded first: every imported module (and everything *they* import) runs
 * before dotenv.config() ever executes. Any module that reads
 * `process.env.X` at the top level (e.g. `const JWT_SECRET =
 * process.env.JWT_SECRET`) would capture `undefined`.
 *
 * Importing this file first — as a bare side-effect import, before any
 * other local import — guarantees dotenv has run before those modules
 * are evaluated, because import order between separate import statements
 * IS preserved (only hoisting within/across statements is the trap).
 */
import dotenv from 'dotenv';
dotenv.config();
