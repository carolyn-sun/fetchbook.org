import { defineMiddleware } from "astro:middleware";
import { verify } from "hono/jwt"; // We can still use hono/jwt since we installed hono
import { typedEnv as env } from "./utils/env";

export const onRequest = defineMiddleware(async (context, next) => {
	const token = context.cookies.get("auth_token")?.value;
	// Ensure we fallback gracefully if bindings are not available (e.g. strict dev mode not passed wrapper properly, etc)
	const JWT_SECRET = env.JWT_SECRET;

	if (token && JWT_SECRET) {
		try {
			const payload = await verify(token, JWT_SECRET, "HS256");
			if (payload && typeof payload.username === "string") {
				context.locals.user = { username: payload.username };
			} else {
				context.locals.user = null;
				context.cookies.delete("auth_token", { path: "/" });
			}
		} catch {
			context.locals.user = null;
			context.cookies.delete("auth_token", { path: "/" });
		}
	} else {
		context.locals.user = null;
	}

	return next();
});
