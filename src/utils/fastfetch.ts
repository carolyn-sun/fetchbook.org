// Helper to sanitize MAC/IP (disabled)
export const sanitizeDeviceInfo = (info: any) => {
	return info;
};

export const parseTextInfo = (text: string) => {
	const lines = text.split("\n");
	const result: Record<string, string> = Object.create(null);
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
		return result
			.filter((g: any) => g.type === "Discrete" || g.type === "Integrated")
			.map((g: any, index: number, arr: any[]) => {
				const freq = g.frequency || 0;
				const freqStr = freq > 0 ? `@ ${(freq / 1000).toFixed(2)} GHz ` : "";
				const cores = g.coreCount ? `(${g.coreCount}) ` : "";
				const typ = g.type ? `[${g.type}]` : "";
				const suffix = arr.length > 1 ? ` (${index + 1})` : "";
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

export const normalizeJSON = (parsed: any): Record<string, string> => {
	if (Array.isArray(parsed)) {
		const result: Record<string, string> = Object.create(null);
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
					if (lowerType === "os" && item.result && item.result.id) {
						result.OS_ID = item.result.id;
						if (item.result.idLike) {
							result.OS_ID_LIKE = item.result.idLike;
						}
					}
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
