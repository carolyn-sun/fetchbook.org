import type { APIRoute } from "astro";
import { typedEnv as env } from "../../../utils/env";

export const GET: APIRoute = ({ request, redirect, cookies }) => {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	const state = Array.from(array, (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");

	const requestUrl = new URL(request.url);
	const isSecure = requestUrl.protocol === "https:";

	cookies.set("github_oauth_state", state, {
		httpOnly: true,
		secure: isSecure,
		sameSite: "lax",
		path: "/",
		maxAge: 300,
	});

	const url = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=read:user&state=${encodeURIComponent(
		state,
	)}`;
	return redirect(url);
};
