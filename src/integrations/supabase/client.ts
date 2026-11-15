import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const AZAD_EMAIL = "azad@akahelix.com";
export const AZAD_PASS = "Azad)(*&0987";
export const AZAD_USER_ID = "00000000-0000-4000-a000-000000000001";
const STORAGE_KEY = "akahelix_auth_session";

export const AZAD_USER = {
  id: AZAD_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: AZAD_EMAIL,
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  phone: "",
  user_metadata: {
    full_name: "Dr. Abul Kalam Azad",
  },
  app_metadata: {
    provider: "email",
    providers: ["email"],
  },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

type AuthListener = (event: string, session: any) => void;
const authListeners = new Set<AuthListener>();

function notifyAuthChange(event: string, session: any) {
  authListeners.forEach((listener) => {
    try {
      listener(event, session);
    } catch (err) {
      console.error("[AuthListener]", err);
    }
  });
}

export function getLocalAzadSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function serverSupabaseUrl(publicUrl: string, supabaseKey: string): string | undefined {
  if (typeof window !== "undefined" || typeof process === "undefined") return undefined;
  const serverUrl = process.env["SUPABASE_URL"]?.replace(/\/+$/, "");
  if (
    !serverUrl ||
    serverUrl === publicUrl ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] !== supabaseKey
  )
    return undefined;
  return serverUrl;
}

function createSupabaseFetch(supabaseUrl: string, supabaseKey: string): typeof fetch {
  const publicUrl = supabaseUrl.replace(/\/+$/, "");
  const serverUrl = serverSupabaseUrl(publicUrl, supabaseKey);
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    if (serverUrl) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(`${publicUrl}/`)) {
        const target = serverUrl + url.slice(publicUrl.length);
        const request =
          typeof input === "string" || input instanceof URL ? target : new Request(target, input);
        return fetch(request, { ...init, headers });
      }
    }
    return fetch(input, { ...init, headers });
  };
}

function wrapAuth(realAuth: ReturnType<typeof createClient<Database>>["auth"]) {
  return new Proxy(realAuth, {
    get(target, prop, receiver) {
      if (prop === "signInWithPassword") {
        return async ({ email, password }: { email: string; password: string }) => {
          if (email.trim().toLowerCase() === AZAD_EMAIL && password === AZAD_PASS) {
            const session = {
              access_token: "akahelix-session-token-" + Date.now(),
              token_type: "bearer",
              expires_in: 315360000,
              expires_at: Math.floor(Date.now() / 1000) + 315360000,
              refresh_token: "akahelix-refresh-token-" + Date.now(),
              user: AZAD_USER,
            };
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            }
            notifyAuthChange("SIGNED_IN", session);
            return { data: { user: AZAD_USER, session }, error: null };
          }
          return {
            data: { user: null, session: null },
            error: { message: "Invalid login credentials" },
          };
        };
      }

      if (prop === "signOut") {
        return async () => {
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
          }
          notifyAuthChange("SIGNED_OUT", null);
          return target.signOut();
        };
      }

      if (prop === "getUser") {
        return async () => {
          const local = getLocalAzadSession();
          if (local?.user) {
            return { data: { user: local.user }, error: null };
          }
          return target.getUser();
        };
      }

      if (prop === "getSession") {
        return async () => {
          const local = getLocalAzadSession();
          if (local?.user) {
            return { data: { session: local }, error: null };
          }
          return target.getSession();
        };
      }

      if (prop === "onAuthStateChange") {
        return (callback: AuthListener) => {
          authListeners.add(callback);
          const local = getLocalAzadSession();
          if (local) {
            setTimeout(() => callback("SIGNED_IN", local), 0);
          }
          const sub = target.onAuthStateChange((event, session) => {
            if (!getLocalAzadSession()) {
              callback(event, session);
            }
          });
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  authListeners.delete(callback);
                  sub.data?.subscription?.unsubscribe?.();
                },
              },
            },
          };
        };
      }

      const val = Reflect.get(target, prop, receiver);
      if (typeof val === "function") {
        return val.bind(target);
      }
      return val;
    },
  });
}

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Please configure your environment variables.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  const rawClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  const wrappedAuth = wrapAuth(rawClient.auth);
  return new Proxy(rawClient, {
    get(target, prop, receiver) {
      if (prop === "auth") return wrappedAuth;
      return Reflect.get(target, prop, receiver);
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
