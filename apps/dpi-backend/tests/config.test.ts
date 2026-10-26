import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { realpath } from "node:fs/promises";
import { loadConfig } from "../src/config.js";

const baseEnv = async () => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "dpi-cfg-")));
  return { DPI_HOME: dir, DPI_ENV_FILE: join(dir, "none.env"), DPI_TOKEN: "x".repeat(43) };
};

test("DPI_PROVIDER defaults to openrouter", async () => {
  const config = loadConfig([], await baseEnv());
  assert.equal(config.provider, "openrouter");
});

test("DPI_PROVIDER accepts faux and zai-coding-cn", async () => {
  const env = await baseEnv();
  assert.equal(loadConfig([], { ...env, DPI_PROVIDER: "faux" }).provider, "faux");
  assert.equal(loadConfig([], { ...env, DPI_PROVIDER: "zai-coding-cn" }).provider, "zai-coding-cn");
});

test("DPI_PROVIDER rejects unknown values with a clear error", async () => {
  const env = await baseEnv();
  assert.throws(() => loadConfig([], { ...env, DPI_PROVIDER: "nope" }), /Invalid DPI_PROVIDER 'nope'.*openrouter.*zai-coding-cn.*faux/);
});

test("DPI_HOME inside the env file applies (home was computed before loadEnvFile)", async (t) => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "dpi-cfg-")));
  const fromFile = join(dir, "home-from-file");
  const envFile = join(dir, "backend.env");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(envFile, `DPI_HOME=${fromFile}\n`);
  const before = process.env.DPI_HOME;
  t.after(() => {
    if (before === undefined) delete process.env.DPI_HOME;
    else process.env.DPI_HOME = before;
  });
  const { DPI_HOME: _drop, ...env } = await baseEnv();
  const config = loadConfig([], { ...env, DPI_ENV_FILE: envFile });
  assert.equal(config.home, fromFile);
  assert.ok(config.dataDir.startsWith(fromFile));
});

test("process env DPI_HOME beats the env file", async (t) => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "dpi-cfg-")));
  const fromFile = join(dir, "home-from-file");
  const fromProcess = join(dir, "home-from-process");
  const envFile = join(dir, "backend.env");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(envFile, `DPI_HOME=${fromFile}\n`);
  const before = process.env.DPI_HOME;
  t.after(() => {
    if (before === undefined) delete process.env.DPI_HOME;
    else process.env.DPI_HOME = before;
  });
  const config = loadConfig([], { ...(await baseEnv()), DPI_HOME: fromProcess, DPI_ENV_FILE: envFile });
  assert.equal(config.home, fromProcess);
});
