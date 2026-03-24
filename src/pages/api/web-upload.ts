import type { APIRoute } from "astro";
import { typedEnv as env } from "../../utils/env";
import {
	normalizeJSON,
	parseTextInfo,
	sanitizeDeviceInfo,
} from "../../utils/fastfetch";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	const formData = await request.formData();
	const isPublic = formData.get("is_public") === "1";
	const deviceInfoStrRaw = formData.get("device_info");
	if (typeof deviceInfoStrRaw !== "string") {
		return new Response(
			"Invalid form submission: missing or invalid 'device_info' field.",
			{ status: 400 },
		);
	}

	const deviceInfoStr = deviceInfoStrRaw.slice(0, 100000);

	const user = locals.user;
	if (!user) {
		return new Response("Unauthorized: Please login.", { status: 401 });
	}
	const username = user.username;

	let deviceInfo: any;
	let rawObj: any = null;

	try {
		rawObj = JSON.parse(deviceInfoStr);
		deviceInfo = normalizeJSON(rawObj);
	} catch (_e) {
		deviceInfo = parseTextInfo(deviceInfoStr);
	}

	if (!username) {
		return new Response("Missing username", { status: 400 });
	}

	const sanitized = sanitizeDeviceInfo(deviceInfo);
	const sanitizedRaw = rawObj ? sanitizeDeviceInfo(rawObj) : null;

	if (
		Object.keys(sanitized).length === 0 ||
		(!sanitized.OS && !sanitized["User@Host"])
	) {
		return new Response(
			'Invalid device metadata: Could not parse fastfetch JSON. Please ensure you are pasting valid full JSON output from "fastfetch --format json".',
			{ status: 400 },
		);
	}

	const countRes = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM devices WHERE username = ?",
	)
		.bind(username)
		.first();
	const count = Number((countRes as any)?.count) || 0;
	if (count >= 50) {
		return new Response(
			"You have reached the maximum limit of 50 devices. Please delete some before uploading more.",
			{ status: 403 },
		);
	}

	const maxSortRes = await env.DB.prepare(
		"SELECT MAX(sort_order) as maxSort FROM devices WHERE username = ?",
	)
		.bind(username)
		.first();
	const newSortOrder = (Number((maxSortRes as any)?.maxSort) || 0) + 1;

	await env.DB.prepare(
		"INSERT INTO devices (username, device_info, raw_device_info, is_public, sort_order) VALUES (?, ?, ?, ?, ?)",
	)
		.bind(
			username,
			JSON.stringify(sanitized),
			sanitizedRaw ? JSON.stringify(sanitizedRaw) : null,
			isPublic ? 1 : 0,
			newSortOrder,
		)
		.run();

	return redirect(`/user/${username}`);
};
