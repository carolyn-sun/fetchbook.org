import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const TARGET_DIR = path.join(process.cwd(), ".fastfetch");
const LOGO_DIR = path.join(TARGET_DIR, "src", "logo", "ascii");
const BUILTIN_C_PATH = path.join(TARGET_DIR, "src", "logo", "builtin.c");
const OUT_FILE = path.join(process.cwd(), "src", "logos.ts");

const COLOR_MAP = {
	FF_COLOR_FG_BLACK: "#3b4252",
	FF_COLOR_FG_RED: "#bf616a",
	FF_COLOR_FG_GREEN: "#a3be8c",
	FF_COLOR_FG_YELLOW: "#ebcb8b",
	FF_COLOR_FG_BLUE: "#81a1c1",
	FF_COLOR_FG_MAGENTA: "#b48ead",
	FF_COLOR_FG_CYAN: "#88c0d0",
	FF_COLOR_FG_WHITE: "#e5e9f0",
	FF_COLOR_FG_LIGHT_BLACK: "#4c566a",
	FF_COLOR_FG_LIGHT_RED: "#bf616a",
	FF_COLOR_FG_LIGHT_GREEN: "#a3be8c",
	FF_COLOR_FG_LIGHT_YELLOW: "#ebcb8b",
	FF_COLOR_FG_LIGHT_BLUE: "#81a1c1",
	FF_COLOR_FG_LIGHT_MAGENTA: "#b48ead",
	FF_COLOR_FG_LIGHT_CYAN: "#88c0d0",
	FF_COLOR_FG_LIGHT_WHITE: "#eceff4",
	FF_COLOR_FG_DEFAULT: "#d4d4d4",
};

function generateLogos() {
	if (!fs.existsSync(TARGET_DIR)) {
		console.log("Cloning fastfetch...");
		execSync("git clone --depth 1 https://github.com/fastfetch-cli/fastfetch.git " + TARGET_DIR, { stdio: "inherit" });
	} else {
		console.log("Pulling latest fastfetch...");
		execSync("git -C " + TARGET_DIR + " pull", { stdio: "inherit" });
	}

	if (!fs.existsSync(LOGO_DIR)) {
		console.error(
			"Failed to clone fastfetch repository",
		);
		process.exit(1);
	}

	// 1. Parse builtin.c to build a mapping from Logo "names" to its config
	const builtinContent = fs.readFileSync(BUILTIN_C_PATH, "utf-8");
	const logoEntries = builtinContent.split(/{\s*\.names\s*=\s*{/);
	logoEntries.shift(); // skip first chunk before any logo

	const configMap = {}; // Maps Macro (e.g. FASTFETCH_DATATEXT_LOGO_MACOS) to Object

	for (const entry of logoEntries) {
		// Extract names: "macOS", "macos"
		const namesMatch = entry.match(/([^}]+)}/);
		if (!namesMatch) continue;
		const namesRaw = namesMatch[1];
		const names = [...namesRaw.matchAll(/"([^"]+)"/g)].map((m) =>
			m[1].toLowerCase(),
		);

		// Extract lines macro: FASTFETCH_DATATEXT_LOGO_MACOS
		const linesMatch = entry.match(
			/\.lines\s*=\s*(FASTFETCH_DATATEXT_LOGO_[A-Z0-9_]+)/,
		);
		if (!linesMatch) continue;
		const linesMacro = linesMatch[1];

		// Extract colors array
		const colorsMatch = entry.match(/\.colors\s*=\s*{([^}]+)}/);
		const colors = [];
		if (colorsMatch) {
			const colorsStr = colorsMatch[1];
			const colorTokens = [...colorsStr.matchAll(/(FF_COLOR_FG_[A-Z_]+)/g)].map(
				(m) => m[1],
			);
			for (const t of colorTokens) {
				colors.push(COLOR_MAP[t] || COLOR_MAP.FF_COLOR_FG_DEFAULT);
			}
		}

		if (!configMap[linesMacro]) {
			configMap[linesMacro] = { names, colors };
		} else {
			configMap[linesMacro].names.push(...names);
		}
	}

	// 2. Parse all txt files, map to their parsed HTML string
	const files = fs.readdirSync(LOGO_DIR).filter((f) => f.endsWith(".txt"));
	const resultData = {};

	for (const file of files) {
		const baseName = file.replace(".txt", "");
		const macroName = `FASTFETCH_DATATEXT_LOGO_${baseName.toUpperCase()}`;
		const config = configMap[macroName] || {
			names: [baseName],
			colors: [COLOR_MAP.FF_COLOR_FG_DEFAULT],
		};

		const rawText = fs.readFileSync(path.join(LOGO_DIR, file), "utf-8");

		// Replace $<num> placeholders with color spans.
		// Fastfetch colors are defined as $1, $2, etc., and they apply cross-line until the next token.
		let currentIdx = 0;
		const htmlLines = rawText.split("\n").map((line) => {
			const r = line
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
			const parts = r.split(/(\$[0-9])/);
			let out = "";

			for (let i = 0; i < parts.length; i++) {
				if (parts[i].match(/^\$[0-9]$/)) {
					// Update stateful color index
					currentIdx = parseInt(parts[i].charAt(1), 10) - 1;
				} else if (parts[i]) {
					// Validate Fastfetch native escape: $$ translates to a single $
					const mappedText = parts[i].replaceAll("$$", "$");
					// Wrap the text completely in the current inherited color
					const color =
						config.colors[currentIdx] || config.colors[0] || "#d4d4d4";
					out += `<span style="color: ${color}">${mappedText}</span>`;
				}
			}
			return out;
		});

		for (const name of config.names) {
			if (!resultData[name]) resultData[name] = htmlLines.join("\n");
		}
	}

	// Generate TS Output
	const outTS = `// AUTO GENERATED. DO NOT EDIT.
export const LOGOS: Record<string, string> = ${JSON.stringify(resultData, null, 2)};

export const getLogoForOS = (...osList: (string | undefined)[]) => {
  const names = osList.filter(Boolean) as string[];
  if (names.length === 0) return LOGOS.debian || '';
  
  const sortedKeys = Object.keys(LOGOS).sort((a, b) => b.length - a.length);

  for (const os of names) {
    const lower = os.toLowerCase();
    
    // Exact match
    if (LOGOS[lower]) return LOGOS[lower];

    // Exact word boundary match
    for (const key of sortedKeys) {
      if (new RegExp(\`\\\\b\${key.replace(/[-\\\\/\\\\^$*+?.()|[\\\\]{}]/g, '\\\\$&')}\\\\b\`).test(lower)) {
        return LOGOS[key];
      }
    }
  }

  // Fuzzy fallback
  for (const os of names) {
    const lower = os.toLowerCase();
    for (const key of sortedKeys) {
      if (lower.includes(key)) return LOGOS[key];
    }
  }

  return LOGOS.debian || '';
};
`;

	fs.writeFileSync(OUT_FILE, outTS, "utf-8");
	console.log(
		`Successfully generated logos.ts with ${Object.keys(resultData).length} aliases from fastfetch submodule.`,
	);
}

generateLogos();
