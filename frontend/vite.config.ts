import fs from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	server: {
		https: {
			key: fs.readFileSync("certs/key.pem"),
			cert: fs.readFileSync("certs/cert.pem"),
		},
	},
});
