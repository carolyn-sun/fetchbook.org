import type { APIRoute } from "astro";
import { typedEnv as env } from "../../../utils/env";
export const GET: APIRoute = ({ redirect }) => {
	const url = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=read:user`;
	return redirect(url);
};
