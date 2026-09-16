#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";

const [filename] = process.argv.slice(2);
if (filename === undefined) {
  console.error("Usage: node skills/hypit/scripts/validate_prompt_pack.mjs <PROMPTS.json>");
  process.exit(2);
}

const fail = (message) => {
  throw new Error(`PROMPTS.json: ${message}`);
};
const object = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
};
const nonEmpty = (value, label) => {
  if (typeof value !== "string" || value.trim().length === 0) fail(`${label} must be a non-empty string`);
};
const positive = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) fail(`${label} must be > 0`);
};
const nonNegative = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(`${label} must be >= 0`);
};
const allowedKeys = (value, allowed, label) => {
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${label}.${key} is not allowed`);
};

try {
  const pack = object(JSON.parse(await readFile(filename, "utf8")), "root");
  allowedKeys(pack, new Set(["format", "language", "source", "target", "prompts"]), "root");
  if (pack.format !== "hypit.prompt-pack@1") fail("format must be hypit.prompt-pack@1");
  nonEmpty(pack.language, "language");
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(pack.language)) fail("language must be a BCP-47 tag");

  const source = object(pack.source, "source");
  allowedKeys(source, new Set(["path", "durationSeconds"]), "source");
  nonEmpty(source.path, "source.path");
  if (isAbsolute(source.path) || source.path.startsWith("\\") || /^[A-Za-z]:/u.test(source.path)) {
    fail("source.path must be relative");
  }
  positive(source.durationSeconds, "source.durationSeconds");

  const target = object(pack.target, "target");
  allowedKeys(target, new Set(["goal", "aspectRatio"]), "target");
  nonEmpty(target.goal, "target.goal");
  if (typeof target.aspectRatio !== "string" || !/^[1-9][0-9]*:[1-9][0-9]*$/u.test(target.aspectRatio)) {
    fail("target.aspectRatio must be width:height");
  }

  if (!Array.isArray(pack.prompts) || pack.prompts.length === 0) fail("prompts must be a non-empty array");
  const ids = new Set();
  for (const [index, rawPrompt] of pack.prompts.entries()) {
    const prompt = object(rawPrompt, `prompts[${index}]`);
    allowedKeys(prompt, new Set([
      "id", "kind", "sourceRange", "purpose", "prompt", "negativePrompt", "durationSeconds",
      "aspectRatio", "referenceAssetIds", "continuityNotes",
    ]), `prompts[${index}]`);
    nonEmpty(prompt.id, `prompts[${index}].id`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(prompt.id)) fail(`prompts[${index}].id must be kebab-case`);
    if (ids.has(prompt.id)) fail(`duplicate prompt id ${prompt.id}`);
    ids.add(prompt.id);
    if (prompt.kind !== "image" && prompt.kind !== "video") fail(`prompts[${index}].kind must be image or video`);
    const range = object(prompt.sourceRange, `prompts[${index}].sourceRange`);
    allowedKeys(range, new Set(["startSeconds", "endSeconds"]), `prompts[${index}].sourceRange`);
    nonNegative(range.startSeconds, `prompts[${index}].sourceRange.startSeconds`);
    positive(range.endSeconds, `prompts[${index}].sourceRange.endSeconds`);
    if (range.endSeconds <= range.startSeconds) fail(`prompts[${index}].sourceRange must have end > start`);
    if (range.startSeconds >= source.durationSeconds) {
      fail(`prompts[${index}].sourceRange.startSeconds must be < source.durationSeconds (${source.durationSeconds})`);
    }
    if (range.endSeconds > source.durationSeconds) {
      fail(`prompts[${index}].sourceRange.endSeconds must be <= source.durationSeconds (${source.durationSeconds})`);
    }
    nonEmpty(prompt.purpose, `prompts[${index}].purpose`);
    nonEmpty(prompt.prompt, `prompts[${index}].prompt`);
    if (prompt.negativePrompt !== undefined) nonEmpty(prompt.negativePrompt, `prompts[${index}].negativePrompt`);
    if (prompt.durationSeconds !== undefined) positive(prompt.durationSeconds, `prompts[${index}].durationSeconds`);
    if (prompt.aspectRatio !== undefined
      && (typeof prompt.aspectRatio !== "string" || !/^[1-9][0-9]*:[1-9][0-9]*$/u.test(prompt.aspectRatio))) {
      fail(`prompts[${index}].aspectRatio must be width:height`);
    }
    if (prompt.referenceAssetIds !== undefined) {
      if (!Array.isArray(prompt.referenceAssetIds)) fail(`prompts[${index}].referenceAssetIds must be an array`);
      const assets = new Set();
      for (const asset of prompt.referenceAssetIds) {
        nonEmpty(asset, `prompts[${index}].referenceAssetIds[]`);
        if (assets.has(asset)) fail(`prompts[${index}].referenceAssetIds must be unique`);
        assets.add(asset);
      }
    }
    if (prompt.continuityNotes !== undefined) nonEmpty(prompt.continuityNotes, `prompts[${index}].continuityNotes`);
  }

  const forbidden = /^(?:provider|model|endpoint|credential|receipt|pricing)$/iu;
  const walk = (value, location) => {
    if (value === null || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, `${location}[${index}]`));
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.test(key)) fail(`${location}.${key} is forbidden in a provider-neutral pack`);
      walk(child, `${location}.${key}`);
    }
  };
  walk(pack, "root");
  console.log(`valid prompt pack: ${pack.prompts.length} prompt(s), language ${pack.language}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
