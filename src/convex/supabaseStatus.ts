import { query } from "./_generated/server";

/**
 * Whether the Supabase env vars are set. Lives outside the Node-runtime
 * supabase.ts (queries can't be defined in "use node" modules). Used by the
 * Media page to show the "add your keys" banner immediately instead of after
 * a failed upload. Only exposes a boolean — never the secrets themselves.
 */
export const status = query({
  args: {},
  handler: () => ({
    configured: Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  }),
});
