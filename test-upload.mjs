import { normalizeJSON } from "./src/utils/fastfetch.ts";
import { sanitizeDeviceInfo } from "./src/utils/fastfetch.ts";
import fs from "fs";

const rawText = fs.readFileSync("test-data/macos.json", "utf-8");
const rawObj = JSON.parse(rawText);
const deviceInfo = normalizeJSON(rawObj);
const sanitized = sanitizeDeviceInfo(deviceInfo);

console.log("OS:", sanitized.OS);
console.log("User@Host:", sanitized["User@Host"]);
console.log("Length:", Object.keys(sanitized).length);
