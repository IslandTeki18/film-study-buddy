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
        output_config: { effort: 'high' },
        system: `${SYSTEM_PROMPT}\nReturn only valid JSON matching this schema, without Markdown fences or other commentary:\n${JSON.stringify(AI_PLAN_SCHEMA)}`,
        messages: [{ role: 'user', content: JSON.stringify({ coachType, intent, focus, brief }) }],
      })
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        const detail = error.message.replaceAll(key, '[redacted]').slice(0, 1000)
        throw new ConvexError(`Could not generate the Report. Claude API: ${detail}`)
      }
      throw new ConvexError('Could not generate the Report. Check the connection and Claude API configuration, then try again.')
    }
    if (response.stop_reason === 'refusal') throw new ConvexError('The model declined to generate this Report.')
    if (response.stop_reason === 'max_tokens') throw new ConvexError('The generated Report was too long. Try again with a shorter focus note.')
    const text = response.content.find((block) => block.type === 'text')?.text
    let parsed: unknown
    try { parsed = JSON.parse(text ?? '') } catch { throw new ConvexError('The generated Report could not be read. Try again.') }
    if (!parsed || typeof parsed !== 'object' || !('heading' in parsed) || !('block1' in parsed)
      || !('block2' in parsed) || !('block3' in parsed) || !('block4' in parsed)
      || !('additionalBlocks' in parsed) || !Array.isArray(parsed.additionalBlocks)) {
      throw new ConvexError('The generated Report is missing required Blocks. Try again.')
    }
    const plan = [parsed.heading, parsed.block1, parsed.block2, parsed.block3, parsed.block4, ...parsed.additionalBlocks]
    if (!parsed.heading || typeof parsed.heading !== 'object' || !('type' in parsed.heading) || parsed.heading.type !== 'heading') {
      throw new ConvexError('The generated Report is missing its opening Heading. Try again.')
    }
    if (plan.length > AI_PLAN_MAX_BLOCKS) {
      throw new ConvexError(`The generated Report contained ${plan.length} Blocks; the limit is ${AI_PLAN_MAX_BLOCKS}. Try a narrower focus.`)
    }
    return ctx.runMutation(internal.aiReports.createGenerated, { workspaceId, name, intent, plan: plan as AiReportPlan, sourceGameIds: brief.snapColumns.map((game) => game.sourceGameId) })
  },
})
