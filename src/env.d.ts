/// <reference types="astro/client" />
import type { D1Database } from "@cloudflare/workers-types";

type MyEnv = {
	DB: D1Database;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	JWT_SECRET: string;
};

declare module "cloudflare:workers" {
	export interface Env extends MyEnv {}
}

type Runtime = import("@astrojs/cloudflare").Runtime<MyEnv>;

declare global {
	namespace App {
		interface Locals extends Runtime {
			user: { username: string } | null;
		}
	}
}
