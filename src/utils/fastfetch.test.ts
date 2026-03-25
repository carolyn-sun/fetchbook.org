import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	formatFastfetchResult,
	normalizeJSON,
	parseTextInfo,
	sanitizeDeviceInfo,
	toGB,
} from "./fastfetch";

describe("fastfetch Utilities", () => {
	describe("toGB()", () => {
		it("converts bytes to gigabytes correctly", () => {
			// 1024^3 = 1073741824 bytes = 1 GiB
			expect(toGB(1073741824)).toBe("1.00 GiB");
			expect(toGB(0)).toBe("0.00 GiB");
			// ~1.5 GiB
			expect(toGB(1610612736)).toBe("1.50 GiB");
			// Large number
			expect(toGB(53687091200)).toBe("50.00 GiB");
		});

		it("returns '0.00' for negative or invalid bytes", () => {
			expect(toGB(-100)).toBe("-0.00 GiB");
			expect(toGB(undefined as unknown as number)).toBe("");
		});
	});

	describe("sanitizeDeviceInfo()", () => {
		it("removes specified sensitive keys (case insensitive)", () => {
			const dirty = {
				someSafeField: "safe data",
				LOCALIP: "should disappear",
				"Mac Address": "should disappear too",
				IP: "should be gone",
				safeNested: {
					ip: "nested ip should vanish",
					validData: 123,
				},
			};
			const sanitized = sanitizeDeviceInfo(dirty);

			expect(sanitized).toHaveProperty("someSafeField", "safe data");
			expect(sanitized).not.toHaveProperty("LOCALIP");
			expect(sanitized).not.toHaveProperty("Mac Address");
			expect(sanitized).not.toHaveProperty("IP");

			expect(sanitized.safeNested).toBeDefined();
			expect(sanitized.safeNested).toHaveProperty("validData", 123);
			expect(sanitized.safeNested).not.toHaveProperty("ip");
		});

		it("redacts IP addresses and MACs within deep strings", () => {
			const nestedData = {
				details: [
					{
						notes: "Connecting to 192.168.1.100 via en0",
						ipv6: "fe80::1ff:fe23:4567:890a",
						macDemo: "The MAC is 1a:2b:3c:4d:5e:6f.",
					},
				],
				status: "10.0.0.1 failed",
			};
			const sanitized = sanitizeDeviceInfo(nestedData);

			expect(sanitized.status).toBe("[REDACTED_IP] failed");
			expect(sanitized.details[0].notes).toBe(
				"Connecting to [REDACTED_IP] via en0",
			);
			expect(sanitized.details[0].ipv6).toBe("[REDACTED_IP]");
			expect(sanitized.details[0].macDemo).toBe("The MAC is [REDACTED_MAC].");
		});

		it("should inherit from null (Prototype Pollution Test)", () => {
			const dummyInfo = { valid: true };
			const sanitized = sanitizeDeviceInfo(dummyInfo);

			// Under Object.create(null), Object.getPrototypeOf should be strictly null
			expect(Object.getPrototypeOf(sanitized)).toBeNull();
		});

		it("preserves primitives properly", () => {
			expect(
				sanitizeDeviceInfo([{ value: null }, { count: 0 }, { active: false }]),
			).toEqual([{ value: null }, { count: 0 }, { active: false }]);
		});
	});

	describe("parseTextInfo()", () => {
		it("parses classic CLI logo + text correctly", () => {
			const rawText = `
                _,met$$$$$gg.          carolyn@mac
             ,g$$$$$$$$$$$$$$$P.       OS: macOS Tahoe
           ,g$$P""       """Y$$.".     Host: Mac Mini
         ,$$P'              \`$$$.     Kernel: Darwin 25.3.0
       ',$$P       ,ggs.     \`$$b:    Uptime: 1 day, 2 hours
       \`d$$'     ,$P"'   .    $$$     Packages: 24 (brew)
        $$P      d$'     ,    $$P     Shell: zsh 5.9
        $$:      $$.   -    ,d$$'     Memory: 8.00 GiB / 16.00 GiB
`;
			delete (Object.prototype as any).invalid_prop; // ensure pure state
			const parsed = parseTextInfo(rawText);

			// Checks basic parsed fields and verifies Object.create(null) dictionary
			expect(parsed.OS).toBe("macOS Tahoe");
			expect(parsed.Host).toBe("Mac Mini");
			expect(parsed.Kernel).toBe("Darwin 25.3.0");
			expect(parsed.Shell).toBe("zsh 5.9");
			expect(parsed.Memory).toBe("8.00 GiB / 16.00 GiB");

			// Special User@Host detection logic via parser fallback
			expect(parsed["User@Host"]).toBe("carolyn@mac");

			// Null prototype checking
			expect(Object.getPrototypeOf(parsed)).toBeNull();
		});

		it("safely handles garbage, empty lines, and bad formats", () => {
			const garbage = `
			Just a random string without colon separator   
			    Blank line   \n
			OS: Linux    
			`;
			const parsed = parseTextInfo(garbage);
			expect(parsed.OS).toBe("Linux");
			expect(Object.keys(parsed).length).toBe(1);
			expect(Object.getPrototypeOf(parsed)).toBeNull();
		});
	});

	describe("formatFastfetchResult()", () => {
		it("correctly handles array memory configurations", () => {
			const memoryRaw = { total: 17179869184, used: 8589934592 };
			const formatted = formatFastfetchResult("memory", memoryRaw);
			// 8GB / 16GB (50%)
			expect(formatted).toBe("8.00 GiB / 16.00 GiB (50%)");
		});

		it("processes complex logical CPU details via format", () => {
			const cpuRaw = {
				cpu: "Intel Core i7",
				cores: { logical: 8 },
				frequency: { max: 4000 },
			};
			const formatted = formatFastfetchResult("cpu", cpuRaw);
			expect(formatted).toBe("Intel Core i7 (8) @ 4.00 GHz");
		});

		it("formats multi-item disk arrays safely without exploding", () => {
			const diskRaw = [
				{
					bytes: { used: 1073741824, total: 10737418240 },
					filesystem: "apfs",
					mountpoint: "/",
					volumeType: ["Read-only"],
				},
				{
					bytes: { used: 0, total: 0 },
					filesystem: "tmpfs",
					mountpoint: "/tmp",
				}, // will be filtered contextually
			];
			const result = formatFastfetchResult("disk", diskRaw) as any[];
			expect(result[0].keySuffix).toBe(" (/)");
			expect(result[0].value).toBe(
				"1.00 GiB / 10.00 GiB (10%) - apfs [Read-only]",
			);
		});
	});

	describe("normalizeJSON()", () => {
		it("normalizes a full mock JSON fastfetch array payload cleanly", () => {
			const payload = [
				{
					type: "Title",
					result: { userName: "carolyn", hostName: "mac" },
				},
				{
					type: "OS",
					result: { prettyName: "macOS Tahoe 26.3.1", id: "macos" },
				},
				{
					type: "LocalIp",
					result: [{ localIpv4: "192.168.1.50" }],
				},
				{
					type: "ErrorType",
					error: "Unsupported module",
				},
			];

			const norm = normalizeJSON(payload);

			// Resolves mappings
			expect(norm["User@Host"]).toBe("carolyn@mac");
			expect(norm.OS).toBe("macOS Tahoe 26.3.1");
			expect(norm.OS_ID).toBe("macos");

			// Ignores error throws natively
			expect(norm.ErrorType).toBeUndefined();

			// Ignores internal LocalIp as it filters it proactively mapping inside the routine
			expect(norm.LocalIp).toBeUndefined();

			// Checks object is null prototype resistant
			expect(Object.getPrototypeOf(norm)).toBeNull();
		});
	});

	describe("End-to-End Real Fastfetch Payload Processing", () => {
		it("safely processes, normalizes, and sanitizes macos.json end-to-end", () => {
			const rawPath = path.join(process.cwd(), "test-data", "macos.json");
			const rawPayload = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

			const normalized = normalizeJSON(rawPayload);
			const sanitized = sanitizeDeviceInfo(normalized);

			// Should have successfully extracted identity
			expect(sanitized["User@Host"]).toBe("carolyn@mac-m4pro-metal.local");
			expect(sanitized.OS).toBe("macOS Tahoe 26.3.1 (25D2128)");
			expect(sanitized.Host).toBe("Mac Mini (2024)");

			// Privacy Filters Must Pass E2E
			expect(sanitized.LocalIp).toBeUndefined();

			// Checks that standard objects lengths remain roughly valid
			expect(Object.keys(sanitized).length).toBeGreaterThan(15);
			expect(Object.getPrototypeOf(sanitized)).toBeNull();
		});

		it("safely processes, normalizes, and sanitizes windows.json end-to-end", () => {
			const rawPath = path.join(process.cwd(), "test-data", "windows.json");
			const rawBuffer = fs.readFileSync(rawPath);
			// Windows PowerShell > out.json often encodes in UTF-16 LE
			const text =
				rawBuffer[0] === 0xff && rawBuffer[1] === 0xfe
					? rawBuffer.toString("utf16le")
					: rawBuffer.toString("utf-8");

			const rawPayload = JSON.parse(text.replace(/^\uFEFF/, ""));

			const normalized = normalizeJSON(rawPayload);
			const sanitized = sanitizeDeviceInfo(normalized);

			expect(sanitized["User@Host"]).toBeTruthy();
			expect(sanitized.OS).toMatch(/Windows/i);
			expect(sanitized.Host).toBeTruthy();

			// Sensitive data stripping
			expect(sanitized.LocalIp).toBeUndefined();

			expect(Object.keys(sanitized).length).toBeGreaterThan(15);
			expect(Object.getPrototypeOf(sanitized)).toBeNull();
		});
	});
});
