import { Honcho } from "@honcho-ai/sdk";

export interface HonchoConfig {
  apiKey: string;
  userName: string;
  assistantName: string;
  baseUrl: string;
  workspaceId: string;
}

const DEFAULT_BASE_URL = "https://api.honcho.dev";

function getEnvString(env: unknown, key: string): string | undefined {
  if (!env || typeof env !== "object") {
    return undefined;
  }

  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : undefined;
}

/**
 * Parse configuration from request headers.
 * Throws on missing required fields so callers get clear errors.
 */
export function parseConfig(request: Request, env?: unknown): HonchoConfig {
  const authHeader = request.headers.get("Authorization");
  const trimmedAuthHeader = authHeader?.trim();
  if (!trimmedAuthHeader?.startsWith("Bearer ")) {
    throw new Error(
      "Missing Authorization header. Provide 'Authorization: Bearer <your-honcho-key>'.",
    );
  }
  const apiKey = trimmedAuthHeader.substring(7).trim();
  if (!apiKey) {
    throw new Error("Authorization header is empty after 'Bearer '.");
  }

  const rawUserName = request.headers.get("X-Honcho-User-Name");
  const userName = rawUserName?.trim();
  if (!userName) {
    throw new Error(
      "Missing X-Honcho-User-Name header. Provide 'X-Honcho-User-Name: <your-name>'.",
    );
  }

  return {
    apiKey,
    userName,
    assistantName: request.headers.get("X-Honcho-Assistant-Name")?.trim() || "Assistant",
    baseUrl:
      request.headers.get("X-Honcho-Base-URL")?.trim() ||
      getEnvString(env, "HONCHO_BASE_URL") ||
      DEFAULT_BASE_URL,
    workspaceId: request.headers.get("X-Honcho-Workspace-ID")?.trim() || "default",
  };
}

export function createClient(config: HonchoConfig): Honcho {
  return new Honcho({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    workspaceId: config.workspaceId,
  });
}
