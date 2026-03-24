import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, params, locals, redirect }) => {
	const id = params.id;
	const user = locals.user;
	if (!user) return new Response("Unauthorized", { status: 401 });

	const formData = await request.formData();

	if (formData.has("note")) {
		const noteValue = formData.get("note");
		const note = noteValue ? String(noteValue).slice(0, 100) : null;
		await env.DB.prepare(
			"UPDATE devices SET note = ? WHERE id = ? AND username = ?",
		)
			.bind(note, id, user.username)
			.run();
	}

	if (formData.has("action")) {
		const action = formData.get("action");
		if (action === "up" || action === "down") {
			const sortOrderOffset = action === "up" ? 1 : -1;
			await env.DB.prepare(
				"UPDATE devices SET sort_order = sort_order + ? WHERE id = ? AND username = ?",
			)
				.bind(sortOrderOffset, id, user.username)
				.run();
		}
	}

	return redirect(`/user/${user.username}`);
};
