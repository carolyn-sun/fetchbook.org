import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ params, locals, redirect }) => {
	const id = params.id;
	const user = locals.user;
	if (!user) return new Response("Unauthorized", { status: 401 });

	await env.DB.prepare("DELETE FROM devices WHERE id = ? AND username = ?")
		.bind(id, user.username)
		.run();

	return redirect(`/user/${user.username}`);
};
