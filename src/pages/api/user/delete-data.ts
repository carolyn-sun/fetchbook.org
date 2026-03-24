import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals, redirect }) => {
	const user = locals.user;
	if (!user) {
		return new Response("Unauthorized", { status: 401 });
	}
	await env.DB.prepare("DELETE FROM devices WHERE username = ?")
		.bind(user.username)
		.run();
	return redirect("/privacy");
};
