export const id = 328;
export const ids = [328];
export const modules = {

/***/ 95328:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cloudflaredBinPath: () => (/* binding */ cloudflaredBinPath),
/* harmony export */   cloudflaredNotice: () => (/* binding */ cloudflaredNotice),
/* harmony export */   installCloudflared: () => (/* binding */ installCloudflared),
/* harmony export */   startCloudflaredTunnel: () => (/* binding */ startCloudflaredTunnel)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73024);
/* harmony import */ var node_os__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(48161);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(76760);
/* harmony import */ var node_https__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(44708);
/* harmony import */ var node_child_process__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(31421);
/* harmony import */ var node_events__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(78474);






const CLOUDFLARED_VERSION = process.env.CLOUDFLARED_VERSION || "2026.7.2";
const RELEASE_BASE = "https://github.com/cloudflare/cloudflared/releases/";
const cloudflaredBinPath = node_path__WEBPACK_IMPORTED_MODULE_2__.join((0,node_os__WEBPACK_IMPORTED_MODULE_1__.tmpdir)(), "node-untun", process.platform === "win32" ? `cloudflared.${CLOUDFLARED_VERSION}.exe` : `cloudflared.${CLOUDFLARED_VERSION}`);
const cloudflaredNotice = `
🔥 Your installation of cloudflared software constitutes a symbol of your signature
   indicating that you accept the terms of the Cloudflare License, Terms and Privacy Policy.

❯ License:         https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/license/
❯ Terms:           https://www.cloudflare.com/terms/
❯ Privacy Policy:  https://www.cloudflare.com/privacypolicy/
`;
const connRegex = /connection[ =]([\da-z-]+)/i;
const ipRegex = /ip=([\d.]+)/;
const locationRegex = /location=([A-Z]+)/;
const indexRegex = /connIndex=(\d)/;
const LINUX_URL = {
	arm64: "cloudflared-linux-arm64",
	arm: "cloudflared-linux-arm",
	x64: "cloudflared-linux-amd64",
	ia32: "cloudflared-linux-386"
};
const MACOS_URL = {
	arm64: "cloudflared-darwin-amd64.tgz",
	x64: "cloudflared-darwin-amd64.tgz"
};
const WINDOWS_URL = {
	x64: "cloudflared-windows-amd64.exe",
	ia32: "cloudflared-windows-386.exe"
};
function resolveBase(version) {
	if (version === "latest") return `${RELEASE_BASE}latest/download/`;
	return `${RELEASE_BASE}download/${version}/`;
}
function installCloudflared(to = cloudflaredBinPath, version = CLOUDFLARED_VERSION) {
	switch (process.platform) {
		case "linux": return installLinux(to, version);
		case "darwin": return installMacos(to, version);
		case "win32": return installWindows(to, version);
		default: throw new Error("Unsupported platform: " + process.platform);
	}
}
async function installLinux(to, version = CLOUDFLARED_VERSION) {
	const file = LINUX_URL[process.arch];
	if (file === void 0) throw new Error("Unsupported architecture: " + process.arch);
	await download(resolveBase(version) + file, to);
	node_fs__WEBPACK_IMPORTED_MODULE_0__.chmodSync(to, "755");
	return to;
}
async function installMacos(to, version = CLOUDFLARED_VERSION) {
	const file = MACOS_URL[process.arch];
	if (file === void 0) throw new Error("Unsupported architecture: " + process.arch);
	await download(resolveBase(version) + file, `${to}.tgz`);
	if (process.env.DEBUG) console.log(`Extracting to ${to}`);
	(0,node_child_process__WEBPACK_IMPORTED_MODULE_4__.execSync)(`tar -xzf ${node_path__WEBPACK_IMPORTED_MODULE_2__.basename(`${to}.tgz`)}`, { cwd: node_path__WEBPACK_IMPORTED_MODULE_2__.dirname(to) });
	node_fs__WEBPACK_IMPORTED_MODULE_0__.unlinkSync(`${to}.tgz`);
	node_fs__WEBPACK_IMPORTED_MODULE_0__.renameSync(`${node_path__WEBPACK_IMPORTED_MODULE_2__.dirname(to)}/cloudflared`, to);
	return to;
}
async function installWindows(to, version = CLOUDFLARED_VERSION) {
	const file = WINDOWS_URL[process.arch];
	if (file === void 0) throw new Error("Unsupported architecture: " + process.arch);
	await download(resolveBase(version) + file, to);
	return to;
}
function download(url, to, redirect = 0) {
	if (redirect === 0) {
		if (process.env.DEBUG) console.log(`Downloading ${url} to ${to}`);
	} else if (process.env.DEBUG) console.log(`Redirecting to ${url}`);
	return new Promise((resolve, reject) => {
		if (!node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync(node_path__WEBPACK_IMPORTED_MODULE_2__.dirname(to))) node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync(node_path__WEBPACK_IMPORTED_MODULE_2__.dirname(to), { recursive: true });
		let done = true;
		const file = node_fs__WEBPACK_IMPORTED_MODULE_0__.createWriteStream(to);
		const request = node_https__WEBPACK_IMPORTED_MODULE_3__.get(url, (res) => {
			if (res.statusCode === 302 && res.headers.location !== void 0) {
				const redirection = res.headers.location;
				done = false;
				file.close(() => resolve(download(redirection, to, redirect + 1)));
				return;
			}
			res.pipe(file);
		});
		file.on("finish", () => {
			if (done) file.close(() => resolve(to));
		});
		request.on("error", (err) => {
			node_fs__WEBPACK_IMPORTED_MODULE_0__.unlink(to, () => reject(err));
		});
		file.on("error", (err) => {
			node_fs__WEBPACK_IMPORTED_MODULE_0__.unlink(to, () => reject(err));
		});
		request.end();
	});
}
function startCloudflaredTunnel(options = {}, extraArgs = []) {
	const args = ["tunnel"];
	for (const [key, value] of Object.entries(options)) if (typeof value === "string") args.push(`${key}`, value);
	else if (typeof value === "number") args.push(`${key}`, value.toString());
	else if (value === null) args.push(`${key}`);
	if (!options["--url"]) args.push("--url", "localhost:8080");
	if (Array.isArray(extraArgs)) args.push(...extraArgs);
	const child = (0,node_child_process__WEBPACK_IMPORTED_MODULE_4__.spawn)(cloudflaredBinPath, args, { stdio: [
		"ignore",
		"pipe",
		"pipe"
	] });
	if (process.env.DEBUG) {
		child.stdout.pipe(process.stdout);
		child.stderr.pipe(process.stderr);
	}
	const urlRegex = /\|\s+(https?:\/\/\S+)/;
	let urlResolver = () => void 0;
	let urlRejector = () => void 0;
	const url = new Promise((...pair) => [urlResolver, urlRejector] = pair);
	url.catch(() => void 0);
	const connectionResolvers = [];
	const connectionRejectors = [];
	const connections = [];
	for (let i = 0; i < 1; i++) connections.push(new Promise((...pair) => [connectionResolvers[i], connectionRejectors[i]] = pair));
	const recentOutput = [];
	const parser = (data) => {
		const str = data.toString();
		for (const line of str.split("\n")) {
			if (!line.trim()) continue;
			recentOutput.push(line.trim());
			if (recentOutput.length > 10) recentOutput.shift();
		}
		const urlMatch = str.match(urlRegex);
		if (urlMatch) urlResolver(urlMatch[1]);
		const connMatch = str.match(connRegex);
		const ipMatch = str.match(ipRegex);
		const locationMatch = str.match(locationRegex);
		const indexMatch = str.match(indexRegex);
		if (connMatch && ipMatch && locationMatch && indexMatch) {
			const [, id] = connMatch;
			const [, ip] = ipMatch;
			const [, location] = locationMatch;
			const [, idx] = indexMatch;
			connectionResolvers[+idx]?.({
				id,
				ip,
				location
			});
		}
	};
	child.stdout.on("data", parser).on("error", urlRejector);
	child.stderr.on("data", parser).on("error", urlRejector);
	child.on("error", urlRejector);
	child.on("exit", (code, signal) => {
		const reason = /* @__PURE__ */ new Error(`cloudflared exited (code=${code}, signal=${signal}) before URL was ready` + (recentOutput.length > 0 ? `\n\n${recentOutput.join("\n")}` : ""));
		urlRejector(reason);
		for (const reject of connectionRejectors) reject?.(reason);
	});
	const stop = async () => {
		if (child.exitCode !== null || child.signalCode !== null) return;
		const exited = (0,node_events__WEBPACK_IMPORTED_MODULE_5__.once)(child, "exit");
		child.kill("SIGINT");
		const killTimer = setTimeout(() => {
			if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
		}, 5e3);
		try {
			await exited;
		} finally {
			clearTimeout(killTimer);
		}
	};
	return {
		url,
		connections,
		child,
		stop
	};
}



/***/ })

};
