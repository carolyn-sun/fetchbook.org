import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { getLogoForOS } from "./logos";

type Bindings = {
	DB: D1Database;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	JWT_SECRET: string;
};

type Variables = {
	user: { username: string } | null;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
	const token = getCookie(c, "auth_token");
	if (token && c.env.JWT_SECRET) {
		try {
			const payload = await verify(token, c.env.JWT_SECRET, "HS256");
			if (payload && typeof payload.username === "string") {
				c.set("user", { username: payload.username });
			} else {
				c.set("user", null);
			}
		} catch {
			c.set("user", null);
		}
	} else {
		c.set("user", null);
	}
	await next();
});

const Layout = (props: {
	title: string;
	children?: any;
	user?: { username: string } | null;
}) => (
	<html>
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<meta name="color-scheme" content="light dark" />
			<meta
				name="theme-color"
				content="#ffffff"
				media="(prefers-color-scheme: light)"
			/>
			<meta
				name="theme-color"
				content="#000000"
				media="(prefers-color-scheme: dark)"
			/>
			<title>{props.title} - fetchbook.org</title>
			<style>{`
        html { background-color: #fff; }
        body { margin: 0; padding: 0; background-color: transparent; }
        #root { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; padding: 1rem; max-width: 1200px; margin: 0 auto; color: #333; background-color: #fff; min-height: 100vh; box-sizing: border-box; }
        h1 { margin-top: 0; }
        textarea, input, select { width: 100%; box-sizing: border-box; padding: 0.5rem; margin-bottom: 1rem; }
        button { font-family: inherit; font-size: 1rem; background: #000; color: #fff; border: none; padding: 0.5rem 1rem; cursor: pointer; border-radius: 4px;}
        button:hover { background: #444; }
        pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; border-radius: 4px; }
        .card { border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;}
        @media (max-width: 768px) {
          .hide-on-mobile { display: none !important; }
        }
        @media (prefers-color-scheme: dark) {
          html { background-color: #000; }
          #root { filter: invert(1) hue-rotate(180deg); }
          .terminal-block, img, video, iframe { filter: invert(1) hue-rotate(180deg); }
        }
      `}</style>
			<script
				dangerouslySetInnerHTML={{
					__html: `
        document.addEventListener("DOMContentLoaded", () => {
          document.querySelectorAll("time.local-time").forEach(el => {
            const dt = el.getAttribute("datetime");
            if (dt) {
              const utcDate = new Date(dt);
              if (!isNaN(utcDate.getTime())) {
                el.textContent = utcDate.toLocaleString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit", second: "2-digit"
                });
              }
            }
          });
        });
      `,
				}}
			/>
		</head>
		<body>
			<div id="root">
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "1rem",
						borderBottom: "1px solid #eee",
						paddingBottom: "1rem",
						marginBottom: "2rem",
					}}
				>
					<h1 style={{ margin: 0 }}>
						<a href="/" style={{ textDecoration: "none", color: "inherit" }}>
							fetchbook.org
						</a>
					</h1>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							flexWrap: "wrap",
							gap: "10px",
						}}
					>
						{props.user ? (
							<span
								style={{
									fontSize: "0.9rem",
									color: "#666",
									display: "flex",
									alignItems: "center",
									flexWrap: "wrap",
									gap: "10px",
								}}
							>
								<a
									href={`/user/${props.user.username}`}
									style={{
										background: "#eee",
										color: "#333",
										textDecoration: "none",
										padding: "6px 12px",
										borderRadius: "6px",
										fontWeight: "bold",
									}}
								>
									my fetchbook
								</a>
								<span>
									Logged in as <strong>{props.user.username}</strong> |{" "}
									<a
										href="/auth/logout"
										style={{ color: "#666", textDecoration: "underline" }}
									>
										Logout
									</a>
								</span>
							</span>
						) : (
							<a
								href="/auth/github/login"
								style={{
									background: "#24292e",
									color: "#fff",
									textDecoration: "none",
									padding: "8px 16px",
									borderRadius: "6px",
									fontSize: "0.9rem",
									fontWeight: "bold",
								}}
							>
								Login with GitHub
							</a>
						)}
					</div>
				</div>
				{props.children}
				<footer
					style={{
						marginTop: "4rem",
						paddingTop: "2rem",
						borderTop: "1px solid #eee",
						color: "#888",
						fontSize: "0.85rem",
						textAlign: "center",
					}}
				>
					fetchbook.org ·{" "}
					<a
						href="https://github.com/carolyn-sun/fetchbook.org"
						target="_blank"
						style={{ color: "#888", textDecoration: "underline" }}
						rel="noopener"
					>
						carolyn-sun/fetchbook.org
					</a>{" "}
					·{" "}
					<a
						href="/privacy"
						style={{ color: "#888", textDecoration: "underline" }}
					>
						Privacy & Data Rights
					</a>
				</footer>
			</div>
		</body>
	</html>
);

// Helper to sanitize MAC/IP (disabled)
const sanitizeDeviceInfo = (info: any) => {
	return info;
};

const parseTextInfo = (text: string) => {
	const lines = text.split("\n");
	const result: Record<string, string> = {};
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
const KEY_MAP: Record<string, string> = {
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

const toGB = (b: number) => `${(b / 1024 / 1024 / 1024).toFixed(2)} GiB`;

const formatFastfetchResult = (
	type: string,
	result: any,
): string | { keySuffix?: string; value: string }[] => {
	if (typeof result === "string") return result;
	// If there's an error string, return it instead of printing blank or undefined
	if (result?.error) return String(result.error);
	if (!result || typeof result !== "object") return String(result);

	const t = type.toLowerCase();
	if (t === "title" || t === "user@host") {
		return `${result.userName || result.user || "user"}@${result.hostName || result.host || "host"}`;
	}
	if (t === "os")
		return `${result.prettyName || result.name || ""} ${result.arch || ""}`.trim();
	if (t === "host")
		return `${result.name || result.family || ""} ${result.version || ""}`.trim();
	if (t === "kernel")
		return `${result.name || ""} ${result.release || result.version || ""}`.trim();
	if (t === "uptime") {
		let s = (result.uptime || 0) / 1000;
		const days = Math.floor(s / 86400);
		s %= 86400;
		const hours = Math.floor(s / 3600);
		s %= 3600;
		const mins = Math.floor(s / 60);
		const pd = days > 0 ? `${days} days, ` : "";
		const ph = hours > 0 ? `${hours} hours, ` : "";
		const pm = mins > 0 ? `${mins} mins` : "";
		return `${pd}${ph}${pm}`.replace(/,\s*$/, "");
	}
	if (t === "packages")
		return Object.entries(result)
			.filter(([_k, v]) => typeof v === "number" && v > 0)
			.map(([k, v]) => `${v} (${k})`)
			.join(", ");
	if (t === "shell")
		return `${result.prettyName || result.name || ""} ${result.version || ""}`.trim();
	if (t === "resolution" || t === "display") {
		if (!Array.isArray(result)) result = [result];
		return result.map((d: any, index: number) => {
			const suffix = d.name
				? ` (${d.name})`
				: result.length > 1
					? ` (${index + 1})`
					: "";
			const res = `${d.output?.width || d.width || 0}x${d.output?.height || d.height || 0}`;
			const rate = d.output?.refreshRate || d.refreshRate || 0;
			const rateStr = rate > 0 ? ` @ ${rate} Hz` : "";
			const typ = d.type ? ` [${d.type}]` : "";
			return { keySuffix: suffix, value: `${res}${rateStr}${typ}` };
		});
	}
	if (t === "de")
		return `${result.prettyName || result.name || ""} ${result.version || ""}`.trim();
	if (t === "wm")
		return `${result.prettyName || result.name || ""} ${result.version || ""}`.trim();
	if (t === "terminal")
		return `${result.prettyName || result.name || ""} ${result.version || ""}`.trim();
	if (t === "cpu") {
		const freq = result.frequency?.max || result.freq?.max || 0;
		const freqStr = freq > 0 ? `@ ${(freq / 1000).toFixed(2)} GHz` : "";
		return `${result.name || result.cpu || ""} (${result.cores?.logical || result.cores?.physical || "?"}) ${freqStr}`.trim();
	}
	if (t === "gpu") {
		if (!Array.isArray(result)) result = [result];
		return result.map((g: any, index: number) => {
			const freq = g.frequency || 0;
			const freqStr = freq > 0 ? `@ ${(freq / 1000).toFixed(2)} GHz ` : "";
			const cores = g.coreCount ? `(${g.coreCount}) ` : "";
			const typ = g.type ? `[${g.type}]` : "";
			const suffix = result.length > 1 ? ` (${index + 1})` : "";
			return {
				keySuffix: suffix,
				value: `${g.name || g.gpu || ""} ${cores}${freqStr}${typ}`.trim(),
			};
		});
	}
	if (t === "memory") {
		if (!result.total) return "";
		const perc = Math.round((result.used / result.total) * 100) || 0;
		return `${toGB(result.used)} / ${toGB(result.total)} (${perc}%)`;
	}
	if (t === "swap") {
		if (Array.isArray(result)) {
			const used = result.reduce(
				(acc: number, curr: any) => acc + (curr.used || 0),
				0,
			);
			const total = result.reduce(
				(acc: number, curr: any) => acc + (curr.total || 0),
				0,
			);
			if (total === 0) return "Disabled";
			const perc = Math.round((used / total) * 100) || 0;
			return `${toGB(used)} / ${toGB(total)} (${perc}%)`;
		}
	}
	if (t === "disk") {
		if (!Array.isArray(result)) result = [result];
		return result
			.map((d: any) => {
				const mp = d.mountpoint || d.name || "/";
				// On Unix/macOS, only show the root disk `/` to avoid partition clutter
				// Windows drives (e.g., `C:\`) don't start with `/` and will pass through
				if (mp.startsWith("/") && mp !== "/") return null;
				const suffix = ` (${mp})`;
				const bytes = d.bytes || d;
				let perc = 0;
				if (bytes.total)
					perc = Math.round((bytes.used / bytes.total) * 100) || 0;
				const ro = d.volumeType?.includes("Read-only") ? " [Read-only]" : "";
				return {
					keySuffix: suffix,
					value: `${toGB(bytes.used)} / ${toGB(bytes.total)} (${perc}%) - ${d.filesystem}${ro}`,
				};
			})
			.filter(Boolean);
	}
	if (t === "battery") {
		if (Array.isArray(result))
			return result.map((b: any) => `${b.capacity}% [${b.status}]`).join(", ");
		return `${result.capacity}% [${result.status}]`;
	}
	if (t === "poweradapter") {
		if (!Array.isArray(result)) result = [result];
		return result
			.map((p: any) => {
				const w = p.watts ? `${p.watts}W` : "";
				const name = p.name && p.name !== "0" ? ` (${p.name})` : "";
				return `${w}${name}`.trim();
			})
			.filter(Boolean)
			.join(", ");
	}
	if (t === "localip") {
		if (Array.isArray(result))
			return result
				.map((ip: any) => ip.localIpv4 || ip.ipv4 || "")
				.filter(Boolean)
				.join(", ");
	}

	if (t === "theme" || t === "wmtheme" || t === "icons") {
		if (typeof result === "string") return result;
		if (result.prettyName) return result.prettyName;
		if (result.name) return result.name;
		return Object.values(result)
			.filter((v) => typeof v === "string" && v)
			.join(", ");
	}
	if (t === "font") {
		if (result.display) return result.display;
		if (result.fonts && Array.isArray(result.fonts))
			return result.fonts
				.map((f: any) => (typeof f === "string" ? f : `${f.name} [${f.type}]`))
				.join(", ");
	}
	if (t === "terminalfont") {
		if (result.display) return result.display;
		if (result.font?.pretty) return result.font.pretty;
		if (result.font?.name)
			return `${result.font.name} ${result.font.size ? `(${result.font.size}pt)` : ""}`.trim();
	}
	if (t === "cursor") {
		if (result.theme)
			return `${result.theme} ${result.size ? `(${result.size}px)` : ""}`.trim();
	}

	// Generic fallback
	const values = [];
	if (Array.isArray(result)) return result.length === 0 ? "" : "[Array]";
	for (const k of Object.keys(result)) {
		if (
			(typeof result[k] === "string" && result[k]) ||
			typeof result[k] === "number"
		)
			values.push(result[k]);
	}
	return values.join(" ");
};

const normalizeJSON = (parsed: any): Record<string, string> => {
	if (Array.isArray(parsed)) {
		const result: Record<string, string> = {};
		for (const item of parsed) {
			if (!item.type) continue;
			if (item.error) continue; // Fastfetch natively skips printing modules that threw errors
			const lowerType = item.type.toLowerCase();
			if (lowerType === "localip") continue;

			// Handle User@Host extraction specifically if title module
			if (lowerType === "title" && item.result) {
				result["User@Host"] = formatFastfetchResult(
					lowerType,
					item.result,
				) as string;
				continue;
			}
			const key =
				KEY_MAP[lowerType] ||
				item.type.charAt(0).toUpperCase() + item.type.slice(1);
			if (item.text) {
				result[key] = String(item.text);
			} else if ("result" in item) {
				const formatted = formatFastfetchResult(lowerType, item.result);
				if (Array.isArray(formatted)) {
					formatted.forEach((f) => {
						if (f.value !== "") {
							result[key + (f.keySuffix || "")] = f.value;
						}
					});
				} else if (formatted !== "") {
					result[key] = formatted as string;
				}
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

const FastfetchRenderer = ({
	username,
	info,
}: {
	username: string;
	info: Record<string, any>;
}) => {
	const keys = Object.keys(info);
	const primaryColor = "#00d2ff"; // Synapse Cyan

	return (
		<div
			className="terminal-block"
			style={{
				backgroundColor: "#1E1E1E",
				color: "#D4D4D4",
				borderRadius: "8px",
				fontFamily:
					'"SF Mono", "Source Code Pro", Consolas, "Courier New", monospace',
				overflow: "hidden",
				maxWidth: "100%",
				border: "1px solid #333",
			}}
		>
			{/* Terminal Body */}
			<div
				style={{
					padding: "1.5rem",
					display: "flex",
					gap: "2.5rem",
					overflowX: "auto",
					fontSize: "14px",
					lineHeight: "1.5",
				}}
			>
				<pre
					class="hide-on-mobile"
					style={{
						margin: 0,
						background: "transparent",
						padding: 0,
						fontFamily: "inherit",
						lineHeight: 1.2,
						flexShrink: 0,
						textShadow: "0 0 5px rgba(255, 255, 255, 0.1)",
					}}
					dangerouslySetInnerHTML={{
						__html: getLogoForOS(info.OS || info.os || info.Os),
					}}
				></pre>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
					}}
				>
					<div style={{ fontWeight: "bold", marginBottom: "4px" }}>
						<span style={{ color: primaryColor }}>
							{info["User@Host"] || `${username}@fetchbook`}
						</span>
					</div>
					<div style={{ marginBottom: "8px", color: "#8A8A8A" }}>
						-------------------------
					</div>
					{keys.map((key) => {
						if (key === "User@Host") return null;
						const val = info[key];
						if (typeof val === "string" || typeof val === "number") {
							return (
								<div key={key}>
									<span style={{ color: primaryColor, fontWeight: "bold" }}>
										{key}
									</span>
									: {val}
								</div>
							);
						}
						return null;
					})}
				</div>
			</div>
		</div>
	);
};

app.get("/", async (c) => {
	const user = c.get("user");

	const recentRes = await c.env.DB.prepare(
		"SELECT username FROM devices WHERE is_public = 1 GROUP BY username ORDER BY MAX(created_at) DESC LIMIT 30",
	).all();
	const recentUsers = (recentRes.results || [])
		.map((r: any) => String(r.username))
		.sort((a, b) => a.localeCompare(b));

	const _origin = new URL(c.req.url).origin;

	return c.html(
		<Layout title="fetchbook" user={user}>
			<div style={{ marginBottom: "3rem" }}>
				<h2>Upload Your Device</h2>
				<p>
					Paste your{" "}
					<code>
						<a href="https://github.com/fastfetch-cli/fastfetch">fastfetch</a>
					</code>{" "}
					JSON below.
				</p>
				<p>
					<code>fastfetch --format json</code>
				</p>

				<div
					style={{
						marginBottom: "2rem",
						background: "#f8f9fa",
						padding: "1rem",
						borderRadius: "8px",
						border: "1px solid #e9ecef",
						fontSize: "0.95rem",
						color: "#495057",
					}}
				>
					<strong style={{ color: "#212529" }}>
						Uploading from a CLI-only environment?
					</strong>
					<div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
						<span style={{ color: "#666" }}>You can copy your unique </span>
						<a
							href={user ? `/user/${user.username}` : "/auth/github/login"}
							style={{
								color: "#000",
								fontWeight: "bold",
								textDecoration: "underline",
							}}
						>
							CLI Token
						</a>
						<span style={{ color: "#666" }}>
							{" "}
							from your profile page after logging in.
						</span>
					</div>
				</div>

				<form
					action="/api/web-upload"
					method="post"
					style={{
						background: "#f9f9f9",
						padding: "1.5rem",
						borderRadius: "8px",
						border: "1px solid #eee",
					}}
				>
					{user ? (
						<>
							<label>
								<strong>Username</strong>
								<input
									type="text"
									name="username"
									value={user.username}
									readOnly
									style={{
										background: "#e9ecef",
										cursor: "not-allowed",
										color: "#495057",
									}}
								/>
							</label>

							<label>
								<strong>Device Info (JSON ONLY)</strong>
								<textarea
									name="device_info"
									rows={6}
									required
									placeholder="Paste raw fastfetch JSON output..."
								></textarea>
							</label>

							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									cursor: "pointer",
									marginBottom: "1rem",
								}}
							>
								<input
									type="checkbox"
									name="is_public"
									value="1"
									checked={true}
									style={{ width: "auto", margin: 0 }}
								/>
								<span style={{ margin: 0 }}>
									Make this public on my fetchbook
								</span>
							</label>

							<br />
							<button
								type="submit"
								style={{
									background: "#000",
									color: "#fff",
									border: "none",
									padding: "10px 20px",
									borderRadius: "4px",
									cursor: "pointer",
									fontWeight: "bold",
								}}
							>
								Publish to fetchbook
							</button>
						</>
					) : (
						<div
							style={{
								padding: "1rem",
								background: "#fff3cd",
								color: "#856404",
								borderRadius: "4px",
								textAlign: "center",
								fontWeight: "bold",
							}}
						>
							Please Login with GitHub to upload your device.
						</div>
					)}
				</form>
			</div>

			{recentUsers.length > 0 && (
				<div
					style={{
						textAlign: "center",
						marginTop: "4rem",
						marginBottom: "2rem",
					}}
				>
					<a
						href="/random"
						style={{
							display: "inline-block",
							background: "#1E1E1E",
							color: "#fff",
							textDecoration: "none",
							padding: "12px 24px",
							borderRadius: "8px",
							fontSize: "1.1rem",
							fontWeight: "bold",
							boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
						}}
					>
						Explore a random fetchbook ✨
					</a>
				</div>
			)}

			{recentUsers.length > 0 && (
				<div style={{ marginBottom: "4rem" }}>
					<h3
						style={{
							textAlign: "center",
							marginBottom: "1.5rem",
							color: "#666",
						}}
					>
						Recently Updated
					</h3>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
							gap: "0.5rem 1rem",
							maxWidth: "900px",
							margin: "0 auto",
							textAlign: "center",
						}}
					>
						{recentUsers.map((u) => (
							<a
								key={u}
								href={`/user/${u}`}
								style={{
									display: "block",
									color: "#333",
									textDecoration: "underline",
									fontSize: "1rem",
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
							>
								{u}
							</a>
						))}
					</div>
				</div>
			)}
		</Layout>,
	);
});

app.post("/api/upload", async (c) => {
	const contentType = c.req.header("Content-Type") || "";
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json(
			{
				error:
					"Missing or invalid Authorization header. Please pass your CLI token as a Bearer token.",
			},
			401,
		);
	}

	const token = authHeader.split(" ")[1];
	let finalUsername = "";
	try {
		const payload = await verify(token, c.env.JWT_SECRET, "HS256");
		if (!payload || typeof payload.username !== "string") throw new Error();
		finalUsername = payload.username;
	} catch {
		return c.json(
			{ error: "Invalid CLI token. Get a fresh one from your profile page." },
			401,
		);
	}

	let deviceInfoRaw: any;

	if (contentType.includes("application/json")) {
		deviceInfoRaw = await c.req.json();
	} else {
		deviceInfoRaw = await c.req.text();
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
		// If it was already parsed as JSON (e.g. from JSON body) as an object wrapper
		const { username: _u, is_public, ...rest } = deviceInfoRaw;
		rawObj = Object.keys(rest).length ? rest : deviceInfoRaw;
		deviceInfo = normalizeJSON(rawObj);
		deviceInfoRaw = { is_public, ...rest }; // for tracking is_public
	}

	const sanitized = sanitizeDeviceInfo(deviceInfo);
	const sanitizedRaw = rawObj ? sanitizeDeviceInfo(rawObj) : null;

	if (
		Object.keys(sanitized).length === 0 ||
		(!sanitized.OS && !sanitized["User@Host"])
	) {
		return c.json(
			{
				error:
					"Invalid device metadata. Please ensure you are sending valid full JSON output from fastfetch.",
			},
			400,
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

	await c.env.DB.prepare(
		"INSERT INTO devices (username, device_info, raw_device_info, is_public) VALUES (?, ?, ?, ?)",
	)
		.bind(
			finalUsername,
			JSON.stringify(sanitized),
			sanitizedRaw ? JSON.stringify(sanitizedRaw) : null,
			isPublic,
		)
		.run();

	return c.json({ success: true, sanitized_info: sanitized });
});

app.post("/api/web-upload", async (c) => {
	const body = await c.req.parseBody();
	const username = body.username as string;
	const isPublic = body.is_public === "1";

	const user = c.get("user");
	if (!user || user.username !== username) {
		return c.text(
			"Unauthorized: You can only upload to your own account.",
			401,
		);
	}

	let deviceInfo: any;
	let rawObj: any = null;

	try {
		rawObj = JSON.parse(body.device_info as string);
		deviceInfo = normalizeJSON(rawObj);
	} catch (_e) {
		deviceInfo = parseTextInfo(body.device_info as string);
	}

	if (!username) {
		return c.text("Missing username", 400);
	}

	const sanitized = sanitizeDeviceInfo(deviceInfo);
	const sanitizedRaw = rawObj ? sanitizeDeviceInfo(rawObj) : null;

	if (
		Object.keys(sanitized).length === 0 ||
		(!sanitized.OS && !sanitized["User@Host"])
	) {
		return c.text(
			'Invalid device metadata: Could not parse fastfetch JSON. Please ensure you are pasting valid full JSON output from "fastfetch --format json".',
			400,
		);
	}

	await c.env.DB.prepare(
		"INSERT INTO devices (username, device_info, raw_device_info, is_public) VALUES (?, ?, ?, ?)",
	)
		.bind(
			username,
			JSON.stringify(sanitized),
			sanitizedRaw ? JSON.stringify(sanitizedRaw) : null,
			isPublic ? 1 : 0,
		)
		.run();

	return c.redirect(`/user/${username}`);
});

app.get("/random", async (c) => {
	const exclude = c.req.query("exclude");
	let randomRes: any;
	if (exclude) {
		randomRes = await c.env.DB.prepare(
			"SELECT DISTINCT username FROM devices WHERE is_public = 1 AND username != ? ORDER BY RANDOM() LIMIT 1",
		)
			.bind(exclude)
			.all();
	} else {
		randomRes = await c.env.DB.prepare(
			"SELECT DISTINCT username FROM devices WHERE is_public = 1 ORDER BY RANDOM() LIMIT 1",
		).all();
	}
	const randomUser = randomRes.results?.[0]?.username;
	if (randomUser) {
		return c.redirect(`/user/${randomUser}`);
	}
	return c.redirect("/");
});

app.get("/user/:username", async (c) => {
	const username = c.req.param("username");
	const user = c.get("user");

	let results: any[];
	const isOwner = user && user.username === username;

	const otherRes = await c.env.DB.prepare(
		"SELECT username FROM devices WHERE is_public = 1 AND username != ? LIMIT 1",
	)
		.bind(username)
		.all();
	const hasOtherUsers = otherRes.results && otherRes.results.length > 0;

	if (isOwner) {
		const res = await c.env.DB.prepare(
			"SELECT * FROM devices WHERE username = ? ORDER BY created_at DESC",
		)
			.bind(username)
			.all();
		results = res.results;
	} else {
		const res = await c.env.DB.prepare(
			"SELECT * FROM devices WHERE username = ? AND is_public = 1 ORDER BY created_at DESC",
		)
			.bind(username)
			.all();
		results = res.results;
	}

	const origin = new URL(c.req.url).origin;
	let cliToken = "";
	if (isOwner) {
		// Generate a long-lived JWT for CLI usage (10 years)
		cliToken = await sign(
			{
				username,
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
			},
			c.env.JWT_SECRET,
			"HS256",
		);
	}

	const cliCommand = `curl -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer ${cliToken}' -d "$(fastfetch --format json)" "${origin}/api/upload"`;
	const psCommand = `Invoke-RestMethod -Uri "${origin}/api/upload" -Method Post -Headers @{ Authorization = "Bearer ${cliToken}"; "Content-Type" = "application/json" } -Body (fastfetch --format json | Out-String)`;

	return c.html(
		<Layout title={`${username}'s fetchbook`} user={user}>
			<h2>{username}'s fetchbook</h2>

			{isOwner && (
				<div
					style={{
						background: "#f8f9fa",
						padding: "16px",
						borderRadius: "8px",
						marginBottom: "2rem",
						border: "1px solid #e9ecef",
					}}
				>
					<h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
						💻 Your CLI Upload Command
					</h3>
					<p
						style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#666" }}
					>
						Run this command directly in your terminal to upload a new setup.
						Keep it secret!
					</p>
					<div style={{ marginBottom: "16px" }}>
						<strong
							style={{
								fontSize: "0.85rem",
								color: "#555",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Linux / macOS (Bash/Zsh)
						</strong>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<div
								style={{
									margin: 0,
									flex: 1,
									fontFamily: "monospace",
									fontSize: "0.85rem",
									padding: "10px",
									borderRadius: "4px",
									border: "1px solid #ced4da",
									background: "#fff",
									whiteSpace: "pre-wrap",
									wordBreak: "break-all",
								}}
							>
								curl -X POST -H 'Content-Type: application/json' -H
								'Authorization: Bearer{" "}
								<span
									class="blur-hover"
									style={{
										filter: "blur(4px)",
										transition: "filter 0.2s",
										cursor: "pointer",
										background: "#eee",
									}}
								>
									{cliToken}
								</span>
								' -d "$(fastfetch --format json)" "{origin}/api/upload"
							</div>
							<button
								type="button"
								class="copy-token-btn"
								data-cmd={cliCommand}
								style={{
									margin: 0,
									padding: "8px 0",
									background: "#212529",
									color: "#fff",
									border: "none",
									fontWeight: "bold",
									borderRadius: "4px",
									width: "90px",
									textAlign: "center",
									flexShrink: 0,
									cursor: "pointer",
								}}
							>
								Copy
							</button>
						</div>
					</div>

					<div>
						<strong
							style={{
								fontSize: "0.85rem",
								color: "#555",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Windows (PowerShell)
						</strong>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<div
								style={{
									margin: 0,
									flex: 1,
									fontFamily: "monospace",
									fontSize: "0.85rem",
									padding: "10px",
									borderRadius: "4px",
									border: "1px solid #ced4da",
									background: "#fff",
									whiteSpace: "pre-wrap",
									wordBreak: "break-all",
								}}
							>
								Invoke-RestMethod -Uri "{origin}/api/upload" -Method Post
								-Headers @{"{"} Authorization = "Bearer{" "}
								<span
									class="blur-hover"
									style={{
										filter: "blur(4px)",
										transition: "filter 0.2s",
										cursor: "pointer",
										background: "#eee",
									}}
								>
									{cliToken}
								</span>
								"; "Content-Type" = "application/json" {"}"} -Body (fastfetch
								--format json | Out-String)
							</div>
							<button
								type="button"
								class="copy-token-btn"
								data-cmd={psCommand}
								style={{
									margin: 0,
									padding: "8px 0",
									background: "#212529",
									color: "#fff",
									border: "none",
									fontWeight: "bold",
									borderRadius: "4px",
									width: "90px",
									textAlign: "center",
									flexShrink: 0,
									cursor: "pointer",
								}}
							>
								Copy
							</button>
						</div>
					</div>
					<style
						dangerouslySetInnerHTML={{
							__html: `
            .blur-hover:hover { filter: none !important; }
          `,
						}}
					/>
					<script
						dangerouslySetInnerHTML={{
							__html: `
            document.querySelectorAll('.copy-token-btn').forEach(btn => {
              btn.addEventListener('click', function() {
                navigator.clipboard.writeText(this.getAttribute('data-cmd'));
                const old = this.innerText;
                this.innerText = 'Copied';
                setTimeout(() => this.innerText = old, 1500);
              });
            });
          `,
						}}
					/>
				</div>
			)}

			<div
				style={{
					marginBottom: "2rem",
					display: "flex",
					gap: "8px",
					alignItems: "center",
				}}
			>
				<strong style={{ color: "#333", fontSize: "0.95rem" }}>Share</strong>
				<div
					id="share-link"
					style={{
						margin: 0,
						background: "#f9f9f9",
						border: "1px solid #ddd",
						color: "#666",
						width: "100%",
						maxWidth: "350px",
						fontFamily: "monospace",
						fontSize: "0.9rem",
						padding: "8px",
						borderRadius: "4px",
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
					}}
				></div>
				<button
					type="button"
					id="copy-btn"
					style={{
						margin: 0,
						padding: "8px 0",
						background: "#efefef",
						color: "#333",
						border: "1px solid #ccc",
						fontWeight: "bold",
						borderRadius: "4px",
						flexShrink: 0,
						width: "90px",
						textAlign: "center",
					}}
				>
					Copy
				</button>
				<script
					dangerouslySetInnerHTML={{
						__html: `
          const linkInput = document.getElementById('share-link');
          linkInput.innerText = window.location.href;
          document.getElementById('copy-btn').addEventListener('click', function() {
            navigator.clipboard.writeText(linkInput.innerText);
            const old = this.innerText;
            this.innerText = 'Copied';
            setTimeout(() => this.innerText = old, 1500);
          });
        `,
					}}
				/>
			</div>
			{results.length === 0 ? (
				<p>No devices found or they are private.</p>
			) : (
				results.map((row: any) => (
					<div class="card">
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<div>
								<p style={{ margin: 0 }}>
									<small>
										<time
											class="local-time"
											datetime={`${row.created_at.replace(" ", "T")}Z`}
										>
											{row.created_at}
										</time>
									</small>
								</p>
								{row.is_public ? (
									<span
										style={{
											color: "green",
											fontSize: "0.8rem",
											fontWeight: "bold",
										}}
									>
										🌐 Public
									</span>
								) : (
									<span
										style={{
											color: "red",
											fontSize: "0.8rem",
											fontWeight: "bold",
										}}
									>
										🔒 Private
									</span>
								)}
							</div>

							{isOwner && (
								<div
									style={{ display: "flex", gap: "8px", alignItems: "center" }}
								>
									<form
										method="post"
										action={`/api/device/${row.id}/visibility`}
										style={{ margin: 0 }}
									>
										<input
											type="hidden"
											name="is_public"
											value={row.is_public ? "0" : "1"}
										/>
										<button
											type="submit"
											style={{
												padding: "4px 8px",
												fontSize: "0.8rem",
												background: "#eee",
												color: "#333",
												border: "1px solid #ccc",
											}}
										>
											{row.is_public ? "Make Private" : "Make Public"}
										</button>
									</form>
									<form
										method="post"
										action={`/api/device/${row.id}/delete`}
										style={{ margin: 0 }}
									>
										<button
											type="submit"
											style={{
												padding: "4px 8px",
												fontSize: "0.8rem",
												background: "#ff4444",
												color: "#fff",
												border: "1px solid #ff4444",
											}}
										>
											Delete
										</button>
									</form>
								</div>
							)}
						</div>
						<div style="margin-top: 1rem;">
							<FastfetchRenderer
								username={row.username}
								info={
									row.raw_device_info
										? normalizeJSON(JSON.parse(row.raw_device_info))
										: JSON.parse(row.device_info)
								}
							/>
						</div>
					</div>
				))
			)}
			{hasOtherUsers && (
				<div
					style={{
						textAlign: "center",
						marginTop: "4rem",
						marginBottom: "2rem",
					}}
				>
					<a
						href={`/random?exclude=${username}`}
						style={{
							display: "inline-block",
							background: "#1E1E1E",
							color: "#fff",
							textDecoration: "none",
							padding: "12px 24px",
							borderRadius: "8px",
							fontSize: "1.1rem",
							fontWeight: "bold",
							boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
						}}
					>
						Explore a random fetchbook ✨
					</a>
				</div>
			)}
		</Layout>,
	);
});

app.post("/api/device/:id/visibility", async (c) => {
	const id = c.req.param("id");
	const user = c.get("user");
	if (!user) return c.text("Unauthorized", 401);

	const body = await c.req.parseBody();
	const isPublic = body.is_public === "1" ? 1 : 0;

	await c.env.DB.prepare(
		"UPDATE devices SET is_public = ? WHERE id = ? AND username = ?",
	)
		.bind(isPublic, id, user.username)
		.run();

	return c.redirect(`/user/${user.username}`);
});

app.post("/api/device/:id/delete", async (c) => {
	const id = c.req.param("id");
	const user = c.get("user");
	if (!user) return c.text("Unauthorized", 401);

	await c.env.DB.prepare("DELETE FROM devices WHERE id = ? AND username = ?")
		.bind(id, user.username)
		.run();

	return c.redirect(`/user/${user.username}`);
});

app.get("/auth/github/login", (c) => {
	const url = `https://github.com/login/oauth/authorize?client_id=${c.env.GITHUB_CLIENT_ID}&scope=read:user`;
	return c.redirect(url);
});

app.get("/auth/github/callback", async (c) => {
	const code = c.req.query("code");
	if (!code) return c.text("Missing code parameter", 400);

	const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			client_id: c.env.GITHUB_CLIENT_ID,
			client_secret: c.env.GITHUB_CLIENT_SECRET,
			code,
		}),
	});

	const tokenData = (await tokenRes.json()) as any;
	if (!tokenData.access_token)
		return c.text("Failed to get access token from GitHub", 400);

	const userRes = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
			"User-Agent": "fetchbook-app",
		},
	});

	if (!userRes.ok)
		return c.text("Failed to get user data from GitHub API", 400);
	const userData = (await userRes.json()) as any;
	const username = userData.login;

	if (!username) return c.text("GitHub account has no valid login", 400);

	const payload = {
		username,
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
	};
	const token = await sign(payload, c.env.JWT_SECRET, "HS256");

	setCookie(c, "auth_token", token, {
		httpOnly: true,
		secure: c.req.url.startsWith("https"),
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return c.redirect("/");
});

app.get("/privacy", (c) => {
	const user = c.get("user");
	const revokeLink = `https://github.com/settings/connections/applications/${c.env.GITHUB_CLIENT_ID}`;
	return c.html(
		<Layout title="Privacy & Data Rights" user={user}>
			<h2>Privacy & Data Rights</h2>

			<div
				style={{
					background: "#f8f9fa",
					padding: "16px",
					borderRadius: "8px",
					border: "1px solid #e9ecef",
					marginBottom: "2rem",
				}}
			>
				<h3 style={{ margin: "0 0 12px 0" }}>What we collect</h3>
				<p style={{ margin: "0 0 8px 0" }}>
					- Your GitHub username to act as your unique identifier.
				</p>
				<p style={{ margin: "0 0 8px 0" }}>
					- The raw device info output generated by{" "}
					<code>fastfetch --format json</code> that you explicitly upload.
				</p>
				<p style={{ margin: 0 }}>
					Every single byte of data you upload remains explicitly yours. We
					don't track your IPs, we don't sell your data, and we don't do
					anything weird with it.
				</p>
			</div>

			<div
				style={{
					background: "#fff3cd",
					padding: "16px",
					borderRadius: "8px",
					border: "1px solid #ffeeba",
				}}
			>
				<h3 style={{ margin: "0 0 12px 0", color: "#856404" }}>
					Erase Your Data
				</h3>
				<p style={{ margin: "0 0 16px 0", color: "#856404" }}>
					You have full control over your data. You can completely erase all
					your device history from fetchbook.org in one click, and then revoke
					the OAuth authorization directly on GitHub.
				</p>

				{user ? (
					<div>
						<form
							action="/api/user/delete-data"
							method="post"
							onsubmit="return confirm('Are you sure? This will delete all your uploaded devices permanently.');"
							style={{ marginBottom: "1rem" }}
						>
							<button
								type="submit"
								style={{
									fontFamily: "inherit",
									fontSize: "1rem",
									background: "transparent",
									color: "#dc3545",
									border: "none",
									padding: 0,
									fontWeight: "bold",
									textDecoration: "underline",
									cursor: "pointer",
								}}
							>
								1. Delete my devices
							</button>
						</form>
						<a
							href={revokeLink}
							target="_blank"
							style={{
								fontFamily: "inherit",
								fontSize: "1rem",
								color: "#24292e",
								fontWeight: "bold",
								textDecoration: "underline",
								cursor: "pointer",
							}}
							rel="noopener"
						>
							2. Revoke OAuth on GitHub
						</a>
					</div>
				) : (
					<p style={{ margin: 0, fontWeight: "bold" }}>
						Please login with GitHub first to manage your data.
					</p>
				)}
			</div>
		</Layout>,
	);
});

app.post("/api/user/delete-data", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.text("Unauthorized", 401);
	}
	await c.env.DB.prepare("DELETE FROM devices WHERE username = ?")
		.bind(user.username)
		.run();
	return c.redirect("/privacy");
});

app.get("/auth/logout", (c) => {
	deleteCookie(c, "auth_token", { path: "/" });
	return c.redirect("/");
});

export default app;
