import { createServer } from "node:http";

function patchLocalStorage() {
  const storage = new Map();
  const shim = {
    getItem(key) {
      const value = storage.get(String(key));
      return value === undefined ? null : value;
    },
    setItem(key, value) {
      storage.set(String(key), String(value));
    },
    removeItem(key) {
      storage.delete(String(key));
    },
    clear() {
      storage.clear();
    },
    key(index) {
      const keys = Array.from(storage.keys());
      return keys[index] ?? null;
    },
    get length() {
      return storage.size;
    },
  };

  if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== "function") {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: shim,
    });
  }
}

async function start() {
  patchLocalStorage();

  const port = Number(process.env.PORT || 3000);
  const hostname = process.env.HOSTNAME || "127.0.0.1";

  const { default: next } = await import("next");
  const app = next({ dev: true, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();
  const handleUpgrade = app.getUpgradeHandler();

  const server = createServer((req, res) => handle(req, res));
  server.on("upgrade", (req, socket, head) => handleUpgrade(req, socket, head));

  server.listen(port, hostname, () => {
    console.log(`LOODI dev server ready at http://${hostname}:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
