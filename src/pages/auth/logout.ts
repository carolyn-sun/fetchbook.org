import type { APIRoute } from "astro";

export const GET: APIRoute = ({ cookies, redirect }) => {
	cookies.delete("auth_token", { path: "/" });
	return redirect("/");
};
