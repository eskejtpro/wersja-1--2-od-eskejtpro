/** Single source of truth for models called by server-side AI endpoints. */
export const AI_MODELS = Object.freeze({
  coachChat: 'gemini-3.5-flash-lite',
  generatePlan: 'gemini-3.8-flash',
  healthAudit: 'gemini-3.8-flash',
  nutritionPlan: 'gemini-3.8-flash',
  swapExercise: 'gemini-3.8-flash',
  tts: 'gemini-3.8-flash-lite-tts',
  parseCommand: 'gemini-3.8-flash',
  analyze: 'gemini-3.8-flash',
} as const);
