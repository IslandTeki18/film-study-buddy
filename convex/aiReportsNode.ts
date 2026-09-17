'use node'

import Anthropic from '@anthropic-ai/sdk'
import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import { action } from './_generated/server'
import { AI_PLAN_SCHEMA, generationResultValidator, type AiReportPlan, type GenerationResult } from './aiReports'
import { AI_FOCUS_MAX_LENGTH, AI_PLAN_MAX_BLOCKS, SYSTEM_PROMPT } from './domain/aiReport.ts'
import { normalizeName } from './domain/names.ts'
import { isCoachingArea } from './domain/starterTemplates.ts'

export const generate = action({
  args: { workspaceId: v.id('workspaces'), name: v.string(), intent: v.union(v.literal('coach'), v.literal('player')), coachType: v.string(), focus: v.optional(v.string()) },
  returns: generationResultValidator,
  handler: async (ctx, { workspaceId, name, intent, coachType, focus }): Promise<GenerationResult> => {
    if (!isCoachingArea(coachType)) throw new ConvexError('Choose a Coaching Area.')
    if (focus && focus.length > AI_FOCUS_MAX_LENGTH) throw new ConvexError(`Focus must be at most ${AI_FOCUS_MAX_LENGTH} characters.`)
    if (!normalizeName(name)) throw new ConvexError('Report name must be 1–80 characters.')
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new ConvexError('AI Report generation is not configured. Set ANTHROPIC_API_KEY on the Convex deployment.')
    const brief = await ctx.runQuery(internal.aiReports.brief, { workspaceId })
    if (brief.totalSnaps === 0 && brief.tendencies.length === 0 && brief.quickNotes.length === 0) {
      throw new ConvexError('Nothing to report on yet. Chart Snaps or save a Tendency / Alert first.')
    }
    const client = new Anthropic({ apiKey: key, maxRetries: 0 })
    let response: Anthropic.Message
    try {
      response = await client.messages.create({
        model: 'claude-opus-5', max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high', format: { type: 'json_schema', schema: AI_PLAN_SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify({ coachType, intent, focus, brief }) }],
      })
    } catch {
      throw new ConvexError('Could not generate the Report. Check the connection and Claude API configuration, then try again.')
    }
    if (response.stop_reason === 'refusal') throw new ConvexError('The model declined to generate this Report.')
    if (response.stop_reason === 'max_tokens') throw new ConvexError('The generated Report was too long. Try again with a shorter focus note.')
    const text = response.content.find((block) => block.type === 'text')?.text
    let parsed: unknown
    try { parsed = JSON.parse(text ?? '') } catch { throw new ConvexError('The generated Report could not be read. Try again.') }
    if (!parsed || typeof parsed !== 'object' || !('blocks' in parsed) || !Array.isArray(parsed.blocks)
      || parsed.blocks.length < 5 || parsed.blocks.length > AI_PLAN_MAX_BLOCKS || parsed.blocks[0]?.type !== 'heading') {
      throw new ConvexError(`The generated Report must start with a Heading and contain 5–${AI_PLAN_MAX_BLOCKS} Blocks. Try again.`)
    }
    return ctx.runMutation(internal.aiReports.createGenerated, { workspaceId, name, intent, plan: parsed.blocks as AiReportPlan, sourceGameIds: brief.snapColumns.map((game) => game.sourceGameId) })
  },
})
