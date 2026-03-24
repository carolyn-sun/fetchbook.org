import type { APIRoute } from "astro";
import { typedEnv as env } from "../../../utils/env";
import { randomBytes } from "crypto";

export const GET: APIRoute = ({ redirect, cookies }) => {
	const state = randomBytes(32).toString("hex");
	cookies.set("github_oauth_state", state, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
	});

	const url = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=read:user&state=${encodeURIComponent(
		state,
	)}`;
	return redirect(url);
};
