/// <reference types="astro/client" />
type D1Database = import("@cloudflare/workers-types").D1Database;

type Runtime = import("@astrojs/cloudflare").Runtime<{
	DB: D1Database;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	JWT_SECRET: string;
}>;

declare namespace App {
	interface Locals extends Runtime {
		user: { username: string } | null;
	}
}
