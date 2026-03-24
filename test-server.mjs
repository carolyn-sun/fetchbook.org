import fs from "fs";
const rawText = fs.readFileSync("test-data/macos.json", "utf-8");
const fd = new FormData();
fd.append("device_info", rawText);
fd.append("is_public", "1");

import { POST } from "./src/pages/api/web-upload.ts";

const req = new Request("http://localhost/api/web-upload", {
  method: "POST",
  body: fd
});

const response = await POST({ request: req, locals: { user: { username: "carolyn" } }, redirect: () => "OK" });
if (response && response.status) {
  console.log("Status:", response.status);
  console.log("Body:", await response.text());
} else {
  console.log("Returned:", response); // it redirects
}
