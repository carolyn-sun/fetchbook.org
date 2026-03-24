import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals, redirect, url }) => {
	const exclude = url.searchParams.get("exclude");
	let randomRes: any;
	if (exclude) {
		randomRes = await env.DB.prepare(
			"SELECT DISTINCT username FROM devices WHERE is_public = 1 AND username != ? ORDER BY RANDOM() LIMIT 1",
		)
			.bind(exclude)
			.all();
	} else {
		randomRes = await env.DB.prepare(
			"SELECT DISTINCT username FROM devices WHERE is_public = 1 ORDER BY RANDOM() LIMIT 1",
		).all();
	}
	const randomUser = randomRes.results?.[0]?.username;
	if (randomUser) {
		return redirect(`/user/${randomUser}`);
	}
	return redirect("/");
};
