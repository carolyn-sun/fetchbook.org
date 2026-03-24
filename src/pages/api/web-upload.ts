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
	const deviceInfoStr = formData.get("device_info") as string;

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

	await env.DB.prepare(
		"INSERT INTO devices (username, device_info, raw_device_info, is_public) VALUES (?, ?, ?, ?)",
	)
		.bind(
			username,
			JSON.stringify(sanitized),
			sanitizedRaw ? JSON.stringify(sanitizedRaw) : null,
			isPublic ? 1 : 0,
		)
		.run();

	return redirect(`/user/${username}`);
};
