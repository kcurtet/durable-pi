import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { homedir } from "node:os";
import { Store } from "../src/store.js";

const routedOptions = async (provider: "zai-coding-cn" | "openrouter") => {
  const root = await realpath(await mkdtemp(join(tmpdir(), `dpi-${provider}-`)));
  await mkdir(join(root, "work"), { recursive: true });
  const options = { dataDir: join(root, "data"), startDirs: [join(root, "work")], name: "test", provider };
  return { root, work: join(root, "work"), options, cleanup: () => rm(root, { recursive: true, force: true }) };
};

test("Store.open with zai-coding-cn: default glm-5.3, validation, session creation (offline)", async (t) => {
  // Hermetic: with an ambient ZAI_CODING_CN_API_KEY, pi-ai's getAvailable lists the bundled
  // models; without it, it degrades to []. Scrub the key so the offline assertion below is
  // deterministic regardless of the machine running the suite.
  const hadKey = process.env.ZAI_CODING_CN_API_KEY;
  if (hadKey) delete process.env.ZAI_CODING_CN_API_KEY;
  t.after(() => {
    if (hadKey) process.env.ZAI_CODING_CN_API_KEY = hadKey;
  });
  const { options, work, cleanup } = await routedOptions("zai-coding-cn");
  t.after(() => void cleanup());
  const store = await Store.open(options);
  t.after(() => store.close());

  assert.equal(store.deviceInfo().defaultModel, "glm-5.3");
  assert.equal(store.deviceInfo().models.length, 0); // no key → provider unauthenticated → empty listing

  assert.deepEqual(store.validateModel({ provider: "zai-coding-cn", modelId: "glm-5.3-flash" }), {
    provider: "zai-coding-cn",
    modelId: "glm-5.3-flash",
  });
  assert.throws(
    () => store.validateModel({ provider: "openrouter", modelId: "anthropic/claude-sonnet-5.5" }),
    /Unknown model/,
  );
  assert.throws(() => store.validateModel({ provider: "zai-coding-cn", modelId: "glm-4.5" }), /Unknown model/);

  const session = await store.create({ name: "zai-test", cwd: work, model: { provider: "zai-coding-cn", modelId: "glm-5.3" } });
  assert.equal(session.model, "glm-5.3");

  // Clamp: a persisted openrouter ref routes to the zai default.
  assert.deepEqual(store.routedModel({ provider: "openrouter", modelId: "anthropic/claude-sonnet-5.5" }), {
    provider: "zai-coding-cn",
    modelId: "glm-5.3",
  });
});

test("Store.open with openrouter (offline) keeps validating its curated models", async (t) => {
  const { options, cleanup } = await routedOptions("openrouter");
  t.after(() => void cleanup());
  const store = await Store.open(options);
  t.after(() => store.close());

  assert.equal(store.deviceInfo().defaultModel, "anthropic/claude-sonnet-5.5");
  assert.deepEqual(store.validateModel({ provider: "openrouter", modelId: "anthropic/claude-sonnet-5.5" }), {
    provider: "openrouter",
    modelId: "anthropic/claude-sonnet-5.5",
  });
  assert.throws(() => store.validateModel({ provider: "zai-coding-cn", modelId: "glm-5.3" }), /Unknown model/);
});
