import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, params, locals, redirect }) => {
	const id = params.id;
	const user = locals.user;
	if (!user) return new Response("Unauthorized", { status: 401 });

	const formData = await request.formData();
	const isPublic = formData.get("is_public") === "1" ? 1 : 0;

	await env.DB.prepare(
		"UPDATE devices SET is_public = ? WHERE id = ? AND username = ?",
	)
		.bind(isPublic, id, user.username)
		.run();

	return redirect(`/user/${user.username}`);
};
