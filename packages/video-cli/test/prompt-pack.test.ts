import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

type Prompt = {
  id: string;
  kind: "image" | "video";
  sourceRange: { startSeconds: number; endSeconds: number };
  purpose: string;
  prompt: string;
};

type PromptPack = {
  format: string;
  language: string;
  source: { path: string; durationSeconds: number };
  target: { goal: string; aspectRatio: string };
  prompts: Prompt[];
};

const validator = fileURLToPath(new URL("../../../skills/hypit/scripts/validate_prompt_pack.mjs", import.meta.url));

function validPack(): PromptPack {
  return {
    format: "hypit.prompt-pack@1",
    language: "ko",
    source: { path: "references/source.mp4", durationSeconds: 10 },
    target: { goal: "Create a provider-neutral visual handoff", aspectRatio: "16:9" },
    prompts: [{
      id: "opening-shot",
      kind: "video",
      sourceRange: { startSeconds: 0, endSeconds: 10 },
      purpose: "Establish the opening visual rhythm",
      prompt: "A restrained opening shot with a clear subject and deliberate camera movement.",
    }],
  };
}

async function runValidator(pack: PromptPack): Promise<{ status: number | null; stdout: string; stderr: string }> {
  const root = await mkdtemp(join(tmpdir(), "hypit-prompt-pack-"));
  try {
    const path = join(root, "PROMPTS.json");
    await writeFile(path, `${JSON.stringify(pack)}\n`);
    const result = spawnSync(process.execPath, [validator, path], {
      encoding: "utf8",
      windowsHide: true,
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("prompt pack validator accepts a valid PROMPTS.json", async () => {
  const result = await runValidator(validPack());
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /valid prompt pack: 1 prompt\(s\), language ko/u);
});

test("prompt pack validator rejects endSeconds <= startSeconds", async () => {
  const pack = validPack();
  pack.prompts[0]!.sourceRange = { startSeconds: 4, endSeconds: 4 };
  const result = await runValidator(pack);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /sourceRange must have end > start/u);
});

test("prompt pack validator rejects endSeconds beyond source.durationSeconds", async () => {
  const pack = validPack();
  pack.prompts[0]!.sourceRange = { startSeconds: 9, endSeconds: 10.001 };
  const result = await runValidator(pack);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /endSeconds must be <= source\.durationSeconds/u);
});

test("prompt pack validator rejects an absolute source.path", async () => {
  const pack = validPack();
  pack.source.path = resolve("source.mp4");
  const result = await runValidator(pack);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /source\.path must be relative/u);
});

test("prompt pack validator rejects duplicate prompt ids", async () => {
  const pack = validPack();
  pack.prompts.push({ ...pack.prompts[0]!, sourceRange: { startSeconds: 1, endSeconds: 2 } });
  const result = await runValidator(pack);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /duplicate prompt id opening-shot/u);
});
