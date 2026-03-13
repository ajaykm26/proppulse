import OpenAI from 'openai';

/**
 * OpenAI client singleton.
 * Initialized here but not yet wired to specific routes — ready for use
 * when AI features are implemented (property summaries, search insights, etc.)
 */

if (!process.env.OPENAI_API_KEY) {
  console.warn('[openai] OPENAI_API_KEY is not set — AI features will not work');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

export default openai;
