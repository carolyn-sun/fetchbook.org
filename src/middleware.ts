import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { verify } from "hono/jwt"; // We can still use hono/jwt since we installed hono

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
			}
		} catch {
			context.locals.user = null;
		}
	} else {
		context.locals.user = null;
	}

	return next();
});
