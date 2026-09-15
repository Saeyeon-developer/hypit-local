# @hypit/whisperx

Explicit WhisperX model-family capability for the official speech program. Importing this package
selects WhisperX; Runtime registration only binds the resulting alignment Need to a concrete
execution endpoint. A Profile may select the HypiHub-hosted or trusted local WhisperX adapter. The
Hypit analysis/prompt path is local-only and uses the local worker without HypiHub credentials or
network calls.

The package contains no credentials, Python environment or queue. Providers translate the typed
request directly into provider-neutral `AlignedTranscriptEvidence`. There is no vendor-shaped
Evidence wrapper or pass-through normalization node in the graph.

`<whisperx:SemanticTake>` is the real-media semantic Surface. It consumes one normalized
`SynchronizedMedia` and exactly one Script Segment. When that Segment contains Tokens, it also
requires `language="en"`, `language="zh"`, `language="es"` or `language="ko"`. The language is passed directly to
WhisperX; Script text and audio are not used to choose it implicitly. `@hypit/media-pipeline`
projects the Take's audio to canonical 16 kHz mono `SpeechEvidenceAudio`; WhisperX sees only those
bytes. A deterministic local alignment then combines the returned evidence with the Segment and
emits one self-contained `SemanticTake`.

For Chinese speech, select `zh` (also `hypit transcribe --language zh` for a reference). WhisperX's
Chinese alignment emits character-sized words, including letters inside some Latin names. The
evidence adapter preserves those windows; the local alignment maps them onto Script's units, so
a complete Latin name can consume several evidence words while neighboring Han characters retain
their own times. Caption gets its displayed wording and Cue breaks from Script, independently of
the recognizer's punctuation or simplified/traditional spelling.

For Korean speech, select `ko` (also `hypit transcribe --language ko`). WhisperX returns word-level
windows for Korean eojeol. The evidence adapter preserves those windows; caption projection keeps
each eojeol as one timing/display unit and never invents Hangul syllable-level timing.

When the authored Segment has no Tokens, write the same Surface without `language`. Its start and
end Anchors map directly to the prepared media's first and final frame. There are no words to align,
so this branch requests no evidence audio and no WhisperX capability:

```svml
<whisperx:SemanticTake id="pause" narrative={story}
  segment={story.segment.pause} media={pause-media.media}/>
```

There is no whole-program WhisperX pass. Timeline assembly only receives already-semantic Takes and later
translates their local frames when assembling the final ProgramSpace and complete semantic map.

`@hypit/provider-hypihub` uploads the canonical evidence audio and requests verbose JSON with
segment- and word-level timestamps when that adapter is explicitly selected by a Profile.
`@hypit/provider-whisperx-local` provides the local analysis path and remains available for any
Profile that should avoid hosted services.
