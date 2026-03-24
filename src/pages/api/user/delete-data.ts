import type { APIRoute } from "astro";
import { typedEnv as env } from "../../../utils/env";

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
