"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/fastfetch.ts
var fastfetch_exports = {};
__export(fastfetch_exports, {
  normalizeJSON: () => normalizeJSON,
  parseTextInfo: () => parseTextInfo,
  sanitizeDeviceInfo: () => sanitizeDeviceInfo
});
module.exports = __toCommonJS(fastfetch_exports);
var sanitizeDeviceInfo = (info) => {
  const SENSITIVE_KEYS = /* @__PURE__ */ new Set([
    "localip",
    "local ip",
    "ip",
    "ip address",
    "mac",
    "mac address"
  ]);
  const ipv4Regex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const ipv6Regex = /\b(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}\b/g;
  const macRegex = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g;
  const redactString = (value) => {
    let redacted = value;
    redacted = redacted.replace(ipv4Regex, "[REDACTED_IP]");
    redacted = redacted.replace(ipv6Regex, "[REDACTED_IP]");
    redacted = redacted.replace(macRegex, "[REDACTED_MAC]");
    return redacted;
  };
  const sanitize = (value, parentKey) => {
    if (value === null || value === void 0) {
      return value;
    }
    if (parentKey) {
      const keyLower = parentKey.toLowerCase();
      if (SENSITIVE_KEYS.has(keyLower)) {
        return void 0;
      }
    }
    const t = typeof value;
    if (t === "string") {
      return redactString(value);
    }
    if (t !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item)).filter((item) => item !== void 0);
    }
    const result = /* @__PURE__ */ Object.create(null);
    for (const key of Object.keys(value)) {
      const sanitized = sanitize(value[key], key);
      if (sanitized !== void 0) {
        result[key] = sanitized;
      }
    }
    return result;
  };
  return sanitize(info);
};
var parseTextInfo = (text) => {
  const lines = text.split("\n");
  const result = /* @__PURE__ */ Object.create(null);
  for (const line of lines) {
    if (line.trim() === "") continue;
    let m = line.match(/(?:^|\s{2,})([A-Za-z\-_][A-Za-z0-9 \-_]*?):\s+(.*)$/);
    if (m) {
      result[m[1].trim()] = m[2].trim();
      continue;
    }
    m = line.match(/(?:^|\s{2,})([a-zA-Z0-9_\-.]+@[a-zA-Z0-9_\-.]+)$/);
    if (m) {
      result["User@Host"] = m[1].trim();
    }
  }
  return result;
};
var KEY_MAP = {
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
  locale: "Locale"
};
var toGB = (b) => `${(b / 1024 / 1024 / 1024).toFixed(2)} GiB`;
var formatFastfetchResult = (type, result) => {
  if (typeof result === "string") return result;
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
    let s = (result.uptime || 0) / 1e3;
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
    return Object.entries(result).filter(([_k, v]) => typeof v === "number" && v > 0).map(([k, v]) => `${v} (${k})`).join(", ");
  if (t === "shell")
    return `${result.prettyName || result.name || ""} ${result.version || ""}`.trim();
  if (t === "resolution" || t === "display") {
    if (!Array.isArray(result)) result = [result];
    return result.map((d, index) => {
      const suffix = d.name ? ` (${d.name})` : result.length > 1 ? ` (${index + 1})` : "";
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
    const freqStr = freq > 0 ? `@ ${(freq / 1e3).toFixed(2)} GHz` : "";
    return `${result.name || result.cpu || ""} (${result.cores?.logical || result.cores?.physical || "?"}) ${freqStr}`.trim();
  }
  if (t === "gpu") {
    if (!Array.isArray(result)) result = [result];
    return result.filter((g) => g.type === "Discrete" || g.type === "Integrated").map((g, index, arr) => {
      const freq = g.frequency || 0;
      const freqStr = freq > 0 ? `@ ${(freq / 1e3).toFixed(2)} GHz ` : "";
      const cores = g.coreCount ? `(${g.coreCount}) ` : "";
      const typ = g.type ? `[${g.type}]` : "";
      const suffix = arr.length > 1 ? ` (${index + 1})` : "";
      return {
        keySuffix: suffix,
        value: `${g.name || g.gpu || ""} ${cores}${freqStr}${typ}`.trim()
      };
    });
  }
  if (t === "memory") {
    if (!result.total) return "";
    const perc = Math.round(result.used / result.total * 100) || 0;
    return `${toGB(result.used)} / ${toGB(result.total)} (${perc}%)`;
  }
  if (t === "swap") {
    if (Array.isArray(result)) {
      const used = result.reduce(
        (acc, curr) => acc + (curr.used || 0),
        0
      );
      const total = result.reduce(
        (acc, curr) => acc + (curr.total || 0),
        0
      );
      if (total === 0) return "Disabled";
      const perc = Math.round(used / total * 100) || 0;
      return `${toGB(used)} / ${toGB(total)} (${perc}%)`;
    }
  }
  if (t === "disk") {
    if (!Array.isArray(result)) result = [result];
    return result.map((d) => {
      const mp = d.mountpoint || d.name || "/";
      if (mp.startsWith("/") && mp !== "/") return null;
      const suffix = ` (${mp})`;
      const bytes = d.bytes || d;
      let perc = 0;
      if (bytes.total)
        perc = Math.round(bytes.used / bytes.total * 100) || 0;
      const ro = d.volumeType?.includes("Read-only") ? " [Read-only]" : "";
      return {
        keySuffix: suffix,
        value: `${toGB(bytes.used)} / ${toGB(bytes.total)} (${perc}%) - ${d.filesystem}${ro}`
      };
    }).filter(Boolean);
  }
  if (t === "battery") {
    if (Array.isArray(result))
      return result.map((b) => `${b.capacity}% [${b.status}]`).join(", ");
    return `${result.capacity}% [${result.status}]`;
  }
  if (t === "poweradapter") {
    if (!Array.isArray(result)) result = [result];
    return result.map((p) => {
      const w = p.watts ? `${p.watts}W` : "";
      const name = p.name && p.name !== "0" ? ` (${p.name})` : "";
      return `${w}${name}`.trim();
    }).filter(Boolean).join(", ");
  }
  if (t === "localip") {
    if (Array.isArray(result))
      return result.map((ip) => ip.localIpv4 || ip.ipv4 || "").filter(Boolean).join(", ");
  }
  if (t === "theme" || t === "wmtheme" || t === "icons") {
    if (typeof result === "string") return result;
    if (result.prettyName) return result.prettyName;
    if (result.name) return result.name;
    return Object.values(result).filter((v) => typeof v === "string" && v).join(", ");
  }
  if (t === "font") {
    if (result.display) return result.display;
    if (result.fonts && Array.isArray(result.fonts))
      return result.fonts.map((f) => typeof f === "string" ? f : `${f.name} [${f.type}]`).join(", ");
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
  const values = [];
  if (Array.isArray(result)) return result.length === 0 ? "" : "[Array]";
  for (const k of Object.keys(result)) {
    if (typeof result[k] === "string" && result[k] || typeof result[k] === "number")
      values.push(result[k]);
  }
  return values.join(" ");
};
var normalizeJSON = (parsed) => {
  if (Array.isArray(parsed)) {
    const result = /* @__PURE__ */ Object.create(null);
    for (const item of parsed) {
      if (!item.type) continue;
      if (item.error) continue;
      const lowerType = item.type.toLowerCase();
      if (lowerType === "localip") continue;
      if (lowerType === "title" && item.result) {
        result["User@Host"] = formatFastfetchResult(
          lowerType,
          item.result
        );
        continue;
      }
      const key = KEY_MAP[lowerType] || item.type.charAt(0).toUpperCase() + item.type.slice(1);
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
          result[key] = formatted;
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
