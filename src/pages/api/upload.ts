import type { APIRoute } from "astro";
import { verify } from "hono/jwt";
import { typedEnv as env } from "../../utils/env";
import {
	normalizeJSON,
	parseTextInfo,
	sanitizeDeviceInfo,
} from "../../utils/fastfetch";

export const POST: APIRoute = async ({ request }) => {
	const contentType = request.headers.get("Content-Type") || "";
	const authHeader = request.headers.get("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return new Response(
			JSON.stringify({
				error:
					"Missing or invalid Authorization header. Please pass your CLI token as a Bearer token.",
			}),
			{ status: 401, headers: { "Content-Type": "application/json" } },
		);
	}

	const token = authHeader.split(" ")[1];
	let finalUsername = "";
	try {
		const payload = await verify(token, env.JWT_SECRET, "HS256");
		if (!payload || typeof payload.username !== "string") throw new Error();
		finalUsername = payload.username;
	} catch {
		return new Response(
			JSON.stringify({
				error: "Invalid CLI token. Get a fresh one from your profile page.",
			}),
			{ status: 401, headers: { "Content-Type": "application/json" } },
		);
	}

	const rawText = await request.text();
	if (rawText.length > 100000) {
		try {
			deviceInfoRaw = await request.json();
		} catch {
			// Fallback to treating the body as text if JSON parsing fails
			deviceInfoRaw = await request.text();
		}
			JSON.stringify({ error: "Payload too large. Max 100KB." }),
			{ status: 413, headers: { "Content-Type": "application/json" } },
		);
	}

	let deviceInfoRaw: any;
	if (contentType.includes("application/json")) {
		try {
			deviceInfoRaw = JSON.parse(rawText);
		} catch {
			return new Response(JSON.stringify({ error: "Invalid JSON format." }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}
	} else {
		deviceInfoRaw = rawText;
	}

	let deviceInfo: any;
	let rawObj: any = null;
	if (typeof deviceInfoRaw === "string") {
		try {
			rawObj = JSON.parse(deviceInfoRaw);
			deviceInfo = normalizeJSON(rawObj);
		} catch {
			deviceInfo = parseTextInfo(deviceInfoRaw);
		}
	} else if (Array.isArray(deviceInfoRaw)) {
		rawObj = deviceInfoRaw;
		deviceInfo = normalizeJSON(rawObj);
	} else {
		const { username: _u, is_public, ...rest } = deviceInfoRaw;
		rawObj = Object.keys(rest).length ? rest : deviceInfoRaw;
		deviceInfo = normalizeJSON(rawObj);
		deviceInfoRaw = { is_public, ...rest };
	}

	const sanitized = sanitizeDeviceInfo(deviceInfo);
	const sanitizedRaw = rawObj ? sanitizeDeviceInfo(rawObj) : null;

	if (
		Object.keys(sanitized).length === 0 ||
		(!sanitized.OS && !sanitized["User@Host"])
	) {
		return new Response(
			JSON.stringify({
				error:
					"Invalid device metadata. Please ensure you are sending valid full JSON output from fastfetch.",
			}),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	let isPublic = 1;
	if (
		typeof deviceInfoRaw === "object" &&
		!Array.isArray(deviceInfoRaw) &&
		"is_public" in deviceInfoRaw
	) {
		isPublic = deviceInfoRaw.is_public ? 1 : 0;
	}

	const countRes = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM devices WHERE username = ?",
	)
		.bind(finalUsername)
		.first();
	const count = Number((countRes as any)?.count) || 0;
	if (count >= 50) {
		return new Response(
			JSON.stringify({
				error:
					"You have reached the maximum limit of 50 devices. Please delete some before uploading more.",
			}),
			{ status: 403, headers: { "Content-Type": "application/json" } },
		);
	}

	await env.DB.prepare(
		"INSERT INTO devices (username, device_info, raw_device_info, is_public) VALUES (?, ?, ?, ?)",
	)
		.bind(
			finalUsername,
			JSON.stringify(sanitized),
			sanitizedRaw ? JSON.stringify(sanitizedRaw) : null,
			isPublic,
		)
		.run();

	return new Response(
		JSON.stringify({ success: true, sanitized_info: sanitized }),
		{
			headers: { "Content-Type": "application/json" },
		},
	);
};
