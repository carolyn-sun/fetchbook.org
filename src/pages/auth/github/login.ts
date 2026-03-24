import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
export const GET: APIRoute = ({ locals, redirect }) => {
	const url = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=read:user`;
	return redirect(url);
};
