import { test } from "node:test";
import assert from "node:assert/strict";
import { providerCatalogs, isKnownModelRef, resolveModelRef } from "../src/model-catalog.js";

test("zai-coding-cn catalog has the 4 GLM models with glm-5.3 default", () => {
  const zai = providerCatalogs["zai-coding-cn"];
  assert.deepEqual(
    zai.models.map((m) => m.id),
    ["glm-5.3", "glm-5.3-flash", "glm-5.3-highspeed", "glm-4.6v"],
  );
  assert.equal(zai.defaultModelId, "glm-5.3");
  assert.ok(zai.models.every((m) => m.icon === "zai.png"));
});

test("openrouter catalog keeps curated models and default intact", () => {
  const or = providerCatalogs.openrouter;
  assert.equal(or.defaultModelId, "anthropic/claude-sonnet-5.5");
  assert.ok(or.models.some((m) => m.id === "anthropic/claude-sonnet-5.5"));
});

test("resolveModelRef without ref returns the provider default", () => {
  assert.deepEqual(resolveModelRef("zai-coding-cn"), { provider: "zai-coding-cn", modelId: "glm-5.3" });
});

test("resolveModelRef passes through known models of the active provider", () => {
  assert.deepEqual(resolveModelRef("zai-coding-cn", { provider: "zai-coding-cn", modelId: "glm-5.3-flash" }), {
    provider: "zai-coding-cn",
    modelId: "glm-5.3-flash",
  });
});

test("resolveModelRef clamps unknown ids to the default", () => {
  assert.deepEqual(resolveModelRef("zai-coding-cn", { provider: "zai-coding-cn", modelId: "glm-4.5" }), {
    provider: "zai-coding-cn",
    modelId: "glm-5.3",
  });
});

test("resolveModelRef clamps cross-provider refs to the active provider default", () => {
  assert.deepEqual(
    resolveModelRef("zai-coding-cn", { provider: "openrouter", modelId: "anthropic/claude-sonnet-5.5" }),
    { provider: "zai-coding-cn", modelId: "glm-5.3" },
  );
  assert.deepEqual(
    resolveModelRef("openrouter", { provider: "x", modelId: "anthropic/claude-sonnet-5.5" }),
    { provider: "openrouter", modelId: "anthropic/claude-sonnet-5.5" },
  );
});

test("isKnownModelRef is provider-scoped", () => {
  assert.equal(isKnownModelRef("zai-coding-cn", { provider: "zai-coding-cn", modelId: "glm-4.6v" }), true);
  assert.equal(isKnownModelRef("zai-coding-cn", { provider: "openrouter", modelId: "anthropic/claude-sonnet-5.5" }), false);
  assert.equal(isKnownModelRef("zai-coding-cn", { provider: "zai-coding-cn", modelId: "glm-4.5" }), false);
  assert.equal(isKnownModelRef("zai-coding-cn", "nonsense"), false);
});
