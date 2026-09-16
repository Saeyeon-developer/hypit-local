# Local analysis and provider-neutral prompts

Use this reference for the `analysis` and `analysis-prompt` modes in the parent Skill. These modes
answer what the supplied video is doing and how a new piece could realize the same intent; they do
not generate, render or export a video.

## Route the request

Choose `analysis` for a reference reading and `analysis-prompt` when the user also wants a Brief,
Treatment and prompts. Make the route explicit in `PROGRESS.md` if the work will continue. Do not
infer `production` from words such as “make a prompt”, “adapt this look” or “write a treatment”.
Production begins only when the user explicitly asks to generate, build, render, export or deliver a
video.

## Local-only guardrails

1. Inspect the local source with `hypit media probe`, `frames`, `tile`/`tiles`, `cut` and boundaries
   as useful. Keep evidence under `references/<id>/evidence/` and record source ranges.
2. If speech is present, use `hypit transcribe ... --language en|zh|es|ko`. Korean WhisperX windows
   are eojeol/word-level evidence; never invent Hangul syllable timestamps. If a local WhisperX
   service is needed, select only `media.local` and `whisperx.local` with the binding below. If the
   service is not ready, record the blocker and continue with visual evidence instead of falling
   back to HypiHub.
3. Do not run `hypit auth` or `runtime up` on the hosted starter. If the local Profile is selected,
   `hypit programs up --endpoint whisperx.local` is allowed for the local speech service. Do not
   run `plan`, `build`, `status`, `get`, Studio, rendering or export. Do not call HypiHub or any generation Provider, and do not create
   generation Needs, SVML/SVS/SVRun files or Runs. The prompt pack is a handoff to the user's own
   provider.

Minimal local Profile when speech timing is required:

```json
{
  "format": "hypit.runtime-local@1",
  "dataRoot": ".hypit/runtimes/local",
  "credentials": {},
  "endpoints": {
    "media.local": { "use": "@hypit/provider-media-local" },
    "whisperx.local": { "use": "@hypit/provider-whisperx-local" }
  },
  "bindings": {
    "@hypit/whisperx@1#whisperx-alignment": "whisperx.local"
  }
}
```

## Evidence and documents

Keep observation separate from interpretation. `ANALYSIS.md` explains the whole piece: purpose,
argument, pacing, recurring visual/sound systems, and why the work holds together. `TIMELINE.md`
locates each meaningful phase by source time and connects speech/action to framing, entry, change,
persistence and exit. Link to transcript and evidence files; preserve unknowns rather than filling
them with guesses.

For `analysis-prompt`, `BRIEF.md` records the user's goal and constraints, `TREATMENT.md` gives the
creative answer, and `PROMPTS.md` is the readable handoff. Prompt entries should identify the source
range, visual purpose, framing/action, continuity, language and negative guidance. Keep them
provider-neutral: no endpoint, model, credential, receipt or price fields.

`PROMPTS.json` is the machine-readable handoff (the prompt pack). Validate it with
[`prompt-pack.schema.json`](../../assets/prompt-pack.schema.json) and the local deterministic
validator `skills/hypit/scripts/validate_prompt_pack.mjs`. Its top-level `language` is a BCP-47 tag;
use `ko` for Korean source or target speech. Prompt `sourceRange` values use seconds from the same
source file named in `source.path`; every range must satisfy
`0 <= startSeconds < endSeconds <= source.durationSeconds`.

The pack may contain `kind: "image"` or `kind: "video"` prompts because a downstream provider may
choose either asset type. This does not authorize Hypit to generate either one. A pack can describe
motion, but it must not contain a generation receipt or a claim that an asset exists.

## Completion checklist

- [ ] The mode is `analysis` or `analysis-prompt`, and no hosted/generation command was used.
- [ ] Source duration, dimensions, frame evidence and transcript language are recorded.
- [ ] Korean speech, if present, is `ko` and remains eojeol/word-timed.
- [ ] `ANALYSIS.md` and `TIMELINE.md` distinguish observation, inference and unknowns.
- [ ] `analysis-prompt` additionally has aligned `BRIEF.md`, `TREATMENT.md`, `PROMPTS.md` and
      `PROMPTS.json` with stable source ranges and unique prompt IDs.
- [ ] The prompt pack passes the schema and deterministic validator.

The two modes are Codex Skill routing modes rather than executable `analysis` commands in the video
Distribution. The repository therefore cannot count every future agent action end to end. Its
testable boundary is covered by the runtime Profile fixture, the local media command tests (which
exercise ffprobe/ffmpeg without a Runtime or network request), and the transcription test (which
observes one local WhisperX alignment Need and zero hosted/generation requests). The Skill must still
keep the complete mode action list local and review the resulting files before handoff.
