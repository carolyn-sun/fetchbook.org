import { env } from "cloudflare:workers";
import type { D1Database } from "@cloudflare/workers-types";

export type Env = {
	DB: D1Database;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	JWT_SECRET: string;
};

export const typedEnv = env as unknown as Env;
