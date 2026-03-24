import type { APIRoute } from "astro";
import { sign } from "hono/jwt";
import { typedEnv as env } from "../../../utils/env";

export const GET: APIRoute = async ({ url, redirect, cookies }) => {
	const code = url.searchParams.get("code");
	if (!code) return new Response("Missing code parameter", { status: 400 });
	let tokenRes: Response;
	try {
		tokenRes = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				client_id: env.GITHUB_CLIENT_ID,
				client_secret: env.GITHUB_CLIENT_SECRET,
				code,
			}),
		});
	} catch {
		// Network or connectivity error when contacting GitHub
		return new Response("Failed to contact GitHub OAuth endpoint", {
			status: 502,
		});
	}

	// Handle non-2xx responses and potential non-JSON bodies from GitHub
	if (!tokenRes.ok) {
		// Try to read and discard response body (may be HTML or plain text)
		try {
			await tokenRes.text();
		} catch {
			// Ignore body read errors; we'll return a generic message
		}

		return new Response("GitHub OAuth token exchange failed. Please restart the login flow.", {
			status: 400,
		});
	}

	let tokenData: any;
	try {
		tokenData = await tokenRes.json();
	} catch {
		return new Response(
			"Invalid response from GitHub when fetching access token",
			{
				status: 502,
			},
		);
	}
	if (!tokenData.access_token)
		return new Response("Failed to get access token from GitHub", {
			status: 400,
		});

	const userRes = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
			"User-Agent": "fetchbook-app",
		},
	});

	if (!userRes.ok)
		return new Response("Failed to get user data from GitHub API", {
			status: 400,
		});
	const userData = (await userRes.json()) as any;
	const username = userData.login;

	if (!username)
		return new Response("GitHub account has no valid login", { status: 400 });

	const payload = {
		username,
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
	};
	const token = await sign(payload, env.JWT_SECRET, "HS256");

	cookies.set("auth_token", token, {
		httpOnly: true,
		secure: url.protocol === "https:",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
		sameSite: "lax",
	});

	return redirect("/");
};
