import { Hono } from "hono";
import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
import { getLogoForOS } from "./logos";

const app = new Hono();
const Layout = (props) =>
	_jsxs("html", {
		children: [
			_jsxs("head", {
				children: [
					_jsx("meta", { charset: "utf-8" }),
					_jsx("meta", {
						name: "viewport",
						content: "width=device-width, initial-scale=1.0",
					}),
					_jsxs("title", { children: [props.title, " - FetchBook.org"] }),
					_jsx("style", {
						children: `
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; padding: 1rem; max-width: 1200px; margin: 0 auto; color: #333; }
        h1 { margin-top: 0; }
        textarea, input, select { width: 100%; box-sizing: border-box; padding: 0.5rem; margin-bottom: 1rem; }
        button { background: #000; color: #fff; border: none; padding: 0.5rem 1rem; cursor: pointer; border-radius: 4px;}
        button:hover { background: #444; }
        pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; border-radius: 4px; }
        .card { border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;}
      `,
					}),
				],
			}),
			_jsxs("body", {
				children: [
					_jsx("h1", {
						children: _jsx("a", {
							href: "/",
							style: "text-decoration: none; color: inherit;",
							children: "FetchBook.org",
						}),
					}),
					_jsx("p", { children: "Save and share your device's setup." }),
					props.children,
				],
			}),
		],
	});
// Helper to sanitize MAC/IP
const sanitizeDeviceInfo = (info) => {
	let str = JSON.stringify(info);
	// Basic naive replacement for IPs and MACs
	str = str.replace(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g, "[IP_ADDRESS]");
	str = str.replace(/(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}/g, "[MAC_ADDRESS]");
	return JSON.parse(str);
};
const parseTextInfo = (text) => {
	const lines = text.split("\n");
	const result = {};
	for (const line of lines) {
		if (line.trim() === "") continue;
		// Match Key: Value separated by a large space from logo
		let m = line.match(/(?:^|\s{2,})([A-Za-z\-_][A-Za-z0-9 \-_]*?):\s+(.*)$/);
		if (m) {
			result[m[1].trim()] = m[2].trim();
			continue;
		}
		// Match user@host
		m = line.match(/(?:^|\s{2,})([a-zA-Z0-9_\-.]+@[a-zA-Z0-9_\-.]+)$/);
		if (m) {
			result["User@Host"] = m[1].trim();
		}
	}
	return result;
};
const KEY_MAP = {
	os: "OS",
	host: "Host",
	kernel: "Kernel",
	uptime: "Uptime",
	packages: "Packages",
	shell: "Shell",
	resolution: "Resolution",
	de: "DE",
	wm: "WM",
	wmtheme: "WM Theme",
	theme: "Theme",
	icons: "Icons",
	font: "Font",
	cursor: "Cursor",
	terminal: "Terminal",
	terminalfont: "Terminal Font",
	cpu: "CPU",
	gpu: "GPU",
	memory: "Memory",
	swap: "Swap",
	disk: "Disk",
	localip: "Local IP",
	battery: "Battery",
	poweradapter: "Power Adapter",
	locale: "Locale",
};
const formatFastfetchResult = (type, result) => {
	if (typeof result === "string") return result;
	// If there's an error string, return it instead of printing blank or undefined
	if (result?.error) return String(result.error);
	if (!result || typeof result !== "object") return String(result);
	const t = type.toLowerCase();
	if (t === "title" || t === "user@host") {
		return `${result.userName || result.user || "user"}@${result.hostName || result.host || "host"}`;
	}
	if (t === "os")
		return `${result.prettyName || result.name || ""} ${result.version || ""} ${result.arch || ""}`.trim();
	if (t === "host")
		return `${result.name || result.family || ""} ${result.version || ""}`.trim();
	if (t === "kernel")
		return `${result.name || ""} ${result.release || result.version || ""}`.trim();
	if (t === "uptime") {
		const d = result.days ? `${result.days} days, ` : "";
		const h = result.hours ? `${result.hours} hours, ` : "";
		const m = result.minutes ? `${result.minutes} mins` : "";
		return (
			`${d}${h}${m}`.trim().replace(/,$/, "") || String(result.uptime || "")
		);
	}
	if (t === "packages")
		return Object.entries(result)
			.filter(([_k, v]) => typeof v === "number" && v > 0)
			.map(([k, v]) => `${v} (${k})`)
			.join(", ");
	if (t === "shell")
		return `${result.prettyName || result.name || ""} ${result.version || ""}`.trim();
	if (t === "resolution" || t === "display") {
		if (Array.isArray(result))
			return result
				.map(
					(d) =>
						`${d.output?.width || d.width || 0}x${d.output?.height || d.height || 0} @ ${d.output?.refreshRate || d.refreshRate || 0}Hz`,
				)
				.join(", ");
		return `${result.width}x${result.height} @ ${result.refreshRate}Hz`;
	}
	if (t === "de")
		return `${result.prettyName || result.name || ""} ${result.version || ""}`.trim();
	if (t === "wm") return `${result.prettyName || result.name || ""}`;
	if (t === "terminal")
		return `${result.prettyName || result.name || ""} ${result.version || ""}`.trim();
	if (t === "cpu")
		return `${result.name || result.cpu || ""} (${result.cores?.logical || result.cores?.physical || "?"}) ${result.freq?.max ? `@ ${result.freq.max > 100 ? (result.freq.max / 1000).toFixed(2) : result.freq.max.toFixed(2)}GHz` : ""}`.trim();
	if (t === "gpu")
		return Array.isArray(result)
			? result.map((g) => g.name || g.gpu).join(", ")
			: `${result.name || result.gpu || ""}`;
	if (t === "memory") {
		const toMB = (b) => `${(b / 1024 / 1024).toFixed(0)}MiB`;
		if (result.used && result.total)
			return `${toMB(result.used)} / ${toMB(result.total)}`;
	}
	if (t === "swap") {
		if (Array.isArray(result)) {
			const used = result.reduce((acc, curr) => acc + (curr.used || 0), 0);
			const total = result.reduce((acc, curr) => acc + (curr.total || 0), 0);
			if (total === 0) return "0MiB / 0MiB";
			const toMB = (b) => `${(b / 1024 / 1024).toFixed(0)}MiB`;
			return `${toMB(used)} / ${toMB(total)}`;
		}
	}
	if (t === "disk") {
		if (Array.isArray(result)) {
			const root = result.find((d) => d.mountpoint === "/") || result[0];
			if (root?.bytes)
				return `${((root.bytes.used / root.bytes.total) * 100).toFixed(0)}% (${root.mountpoint})`;
		}
		return `${result.used?.percentage || 0}%`;
	}
	if (t === "battery") {
		if (Array.isArray(result))
			return result.map((b) => `${b.capacity}% [${b.status}]`).join(", ");
		return `${result.capacity}% [${result.status}]`;
	}
	if (t === "localip") {
		if (Array.isArray(result))
			return result
				.map((ip) => ip.localIpv4 || ip.ipv4 || "")
				.filter(Boolean)
				.join(", ");
	}
	// Generic fallback
	const values = [];
	if (Array.isArray(result)) return result.length === 0 ? "" : "[Array]";
	for (const k of Object.keys(result)) {
		if (typeof result[k] === "string" || typeof result[k] === "number")
			values.push(result[k]);
	}
	return values.join(" ");
};
const normalizeJSON = (parsed) => {
	if (Array.isArray(parsed)) {
		const result = {};
		for (const item of parsed) {
			if (!item.type) continue;
			const lowerType = item.type.toLowerCase();
			// Handle User@Host extraction specifically if title module
			if (lowerType === "title" && item.result) {
				result["User@Host"] = formatFastfetchResult(lowerType, item.result);
				continue;
			}
			const key =
				KEY_MAP[lowerType] ||
				item.type.charAt(0).toUpperCase() + item.type.slice(1);
			if (item.text) {
				result[key] = String(item.text);
			} else if ("result" in item) {
				result[key] = formatFastfetchResult(item.type, item.result);
			} else {
				result[key] = JSON.stringify(item);
			}
		}
		return result;
	} else if (typeof parsed === "object" && parsed !== null) {
		return parsed;
	}
	return {};
};
// Logos are now generated and imported from ./logos.ts
const FastfetchRenderer = ({ username, info }) => {
	const keys = Object.keys(info);
	const primaryColor = "#00d2ff"; // Synapse Cyan
	return _jsxs("div", {
		style: {
			backgroundColor: "#1E1E1E",
			color: "#D4D4D4",
			borderRadius: "10px",
			fontFamily:
				'"SF Mono", "Source Code Pro", Consolas, "Courier New", monospace',
			boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
			overflow: "hidden",
			maxWidth: "100%",
			border: "1px solid #333",
		},
		children: [
			_jsxs("div", {
				style: {
					backgroundColor: "#2D2D2D",
					padding: "8px 12px",
					display: "flex",
					alignItems: "center",
					borderBottom: "1px solid #111",
				},
				children: [
					_jsxs("div", {
						style: { display: "flex", gap: "8px" },
						children: [
							_jsx("div", {
								style: {
									width: "12px",
									height: "12px",
									borderRadius: "50%",
									backgroundColor: "#ff5f56",
								},
							}),
							_jsx("div", {
								style: {
									width: "12px",
									height: "12px",
									borderRadius: "50%",
									backgroundColor: "#ffbd2e",
								},
							}),
							_jsx("div", {
								style: {
									width: "12px",
									height: "12px",
									borderRadius: "50%",
									backgroundColor: "#27c93f",
								},
							}),
						],
					}),
					_jsxs("div", {
						style: {
							flex: 1,
							textAlign: "center",
							color: "#8A8A8A",
							fontSize: "0.8rem",
							fontFamily: "system-ui, -apple-system, sans-serif",
							marginRight: "56px",
						},
						children: [username, " ~ fastfetch"],
					}),
				],
			}),
			_jsxs("div", {
				style: {
					padding: "1.5rem",
					display: "flex",
					gap: "2.5rem",
					overflowX: "auto",
					fontSize: "14px",
					lineHeight: "1.5",
				},
				children: [
					_jsx("pre", {
						style: {
							margin: 0,
							background: "transparent",
							padding: 0,
							fontFamily: "inherit",
							textShadow: "0 0 5px rgba(255, 255, 255, 0.1)",
						},
						dangerouslySetInnerHTML: {
							__html: getLogoForOS(info.OS || info.os || info.Os),
						},
					}),
					_jsxs("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
						},
						children: [
							_jsx("div", {
								style: { fontWeight: "bold", marginBottom: "4px" },
								children: _jsx("span", {
									style: { color: primaryColor },
									children: info["User@Host"] || `${username}@fetchbook`,
								}),
							}),
							_jsx("div", {
								style: { marginBottom: "8px", color: "#8A8A8A" },
								children: "-------------------------",
							}),
							keys.map((key) => {
								if (key === "User@Host") return null;
								const val = info[key];
								if (typeof val === "string" || typeof val === "number") {
									return _jsxs(
										"div",
										{
											children: [
												_jsx("span", {
													style: { color: primaryColor, fontWeight: "bold" },
													children: key,
												}),
												": ",
												val,
											],
										},
										key,
									);
								}
								return null;
							}),
							_jsxs("div", {
								style: { display: "flex", gap: "0", marginTop: "16px" },
								children: [
									_jsx("div", {
										style: {
											width: "2rem",
											height: "1rem",
											backgroundColor: "#3b4252",
										},
									}),
									_jsx("div", {
										style: {
											width: "2rem",
											height: "1rem",
											backgroundColor: "#bf616a",
										},
									}),
									_jsx("div", {
										style: {
											width: "2rem",
											height: "1rem",
											backgroundColor: "#a3be8c",
										},
									}),
									_jsx("div", {
										style: {
											width: "2rem",
											height: "1rem",
											backgroundColor: "#ebcb8b",
										},
									}),
									_jsx("div", {
										style: {
											width: "2rem",
											height: "1rem",
											backgroundColor: "#81a1c1",
										},
									}),
									_jsx("div", {
										style: {
											width: "2rem",
											height: "1rem",
											backgroundColor: "#b48ead",
										},
									}),
									_jsx("div", {
										style: {
											width: "2rem",
											height: "1rem",
											backgroundColor: "#88c0d0",
										},
									}),
									_jsx("div", {
										style: {
											width: "2rem",
											height: "1rem",
											backgroundColor: "#e5e9f0",
										},
									}),
								],
							}),
						],
					}),
				],
			}),
		],
	});
};
app.get("/", (c) => {
	// Equivalent to /fetch
	return c.redirect("/fetch");
});
app.get("/fetch", (c) => {
	return c.html(
		_jsxs(Layout, {
			title: "Upload Device",
			children: [
				_jsx("h2", { children: "Upload Device Info" }),
				_jsxs("p", {
					children: [
						"Paste your ",
						_jsx("code", { children: "fastfetch" }),
						" JSON or default Terminal output text below.",
					],
				}),
				_jsxs("form", {
					action: "/api/web-upload",
					method: "post",
					children: [
						_jsxs("label", {
							children: [
								_jsx("strong", { children: "Username (GitHub OAuth pending)" }),
								_jsx("input", {
									type: "text",
									name: "username",
									required: true,
									placeholder: "exampleUser",
								}),
							],
						}),
						_jsxs("label", {
							children: [
								_jsx("strong", { children: "Device Info (JSON or Text)" }),
								_jsx("textarea", {
									name: "device_info",
									rows: 10,
									placeholder: "Paste raw JSON or normal fastfetch output...",
								}),
							],
						}),
						_jsxs("label", {
							children: [
								_jsx("input", {
									type: "checkbox",
									name: "is_public",
									value: "1",
								}),
								" Make this public",
							],
						}),
						_jsx("br", {}),
						_jsx("button", { type: "submit", children: "Save Device" }),
					],
				}),
			],
		}),
	);
});
app.post("/api/upload", async (c) => {
	const contentType = c.req.header("Content-Type") || "";
	const username = c.req.query("username");
	let deviceInfoRaw;
	if (contentType.includes("application/json")) {
		deviceInfoRaw = await c.req.json();
		// Assuming API user passes username in JSON body if missing in query
		if (!username && deviceInfoRaw.username) {
			const { username: jsonUsername, is_public, ...rest } = deviceInfoRaw;
			deviceInfoRaw = rest;
			c.req.query = () => jsonUsername; // small hack for scope, actually let's just use variable
		}
	} else {
		deviceInfoRaw = await c.req.text();
	}
	const finalUsername =
		username ||
		(typeof deviceInfoRaw === "object" ? deviceInfoRaw.username : "");
	if (!finalUsername) {
		return c.json(
			{
				error:
					"Missing username. Please pass it via ?username=... or inside JSON",
			},
			400,
		);
	}
	let deviceInfo;
	if (typeof deviceInfoRaw === "string") {
		try {
			deviceInfo = normalizeJSON(JSON.parse(deviceInfoRaw));
		} catch {
			deviceInfo = parseTextInfo(deviceInfoRaw);
		}
	} else {
		// If it was already parsed as JSON (e.g. from JSON body)
		// Extract out is_public and username if present
		const { username: _u, is_public, ...rest } = deviceInfoRaw;
		deviceInfo = normalizeJSON(rest);
		deviceInfoRaw = { is_public, ...rest }; // for tracking is_public
	}
	const sanitized = sanitizeDeviceInfo(deviceInfo);
	const isPublic =
		typeof deviceInfoRaw === "object" && deviceInfoRaw.is_public ? 1 : 0;
	await c.env.DB.prepare(
		"INSERT INTO devices (username, device_info, is_public) VALUES (?, ?, ?)",
	)
		.bind(finalUsername, JSON.stringify(sanitized), isPublic)
		.run();
	return c.json({ success: true, sanitized_info: sanitized });
});
app.post("/api/web-upload", async (c) => {
	const body = await c.req.parseBody();
	const username = body.username;
	const isPublic = body.is_public === "1";
	let deviceInfo;
	try {
		deviceInfo = normalizeJSON(JSON.parse(body.device_info));
	} catch (_e) {
		deviceInfo = parseTextInfo(body.device_info);
	}
	if (!username) {
		return c.text("Missing username", 400);
	}
	const sanitized = sanitizeDeviceInfo(deviceInfo);
	await c.env.DB.prepare(
		"INSERT INTO devices (username, device_info, is_public) VALUES (?, ?, ?)",
	)
		.bind(username, JSON.stringify(sanitized), isPublic ? 1 : 0)
		.run();
	return c.redirect(`/user/${username}`);
});
app.get("/user/:username", async (c) => {
	const username = c.req.param("username");
	const { results } = await c.env.DB.prepare(
		// Since there's no OAuth yet, visiting /user/:username as a guest should only show public devices.
		"SELECT * FROM devices WHERE username = ? AND is_public = 1 ORDER BY created_at DESC",
	)
		.bind(username)
		.all();
	return c.html(
		_jsxs(Layout, {
			title: `${username}'s Devices`,
			children: [
				_jsxs("h2", { children: [username, "'s Devices"] }),
				results.length === 0
					? _jsx("p", { children: "No devices found or they are private." })
					: results.map((row) =>
							_jsxs("div", {
								class: "card",
								children: [
									_jsx("p", {
										children: _jsx("small", { children: row.created_at }),
									}),
									row.is_public
										? _jsx("span", {
												style: "color: green; font-size: 0.8rem;",
												children: "Public",
											})
										: _jsx("span", {
												style: "color: red; font-size: 0.8rem;",
												children: "Private",
											}),
									_jsx("div", {
										style: "margin-top: 1rem;",
										children: _jsx(FastfetchRenderer, {
											username: row.username,
											info: JSON.parse(row.device_info),
										}),
									}),
								],
							}),
						),
			],
		}),
	);
});
export default app;
