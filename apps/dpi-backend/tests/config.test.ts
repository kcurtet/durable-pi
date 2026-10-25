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
