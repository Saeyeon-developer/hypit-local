import type { SpeechEvidenceAudio } from "@hypit/speech";

/** Languages supported by the public WhisperX contract. */
export const whisperXLanguages = ["en", "zh", "es", "ko"] as const;
export type WhisperXLanguage = typeof whisperXLanguages[number];

export function isWhisperXLanguage(value: unknown): value is WhisperXLanguage {
  return typeof value === "string" && (whisperXLanguages as readonly string[]).includes(value);
}

export type WhisperXAlignmentRequest = {
  readonly audio: SpeechEvidenceAudio["artifact"];
  readonly sampleFrames: number;
  readonly language: WhisperXLanguage;
};
