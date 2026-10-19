import { httpRouter } from 'convex/server'
import { WebhookReceiver } from 'livekit-server-sdk'
import { internal } from './_generated/api'
import { env, httpAction } from './_generated/server'

const http = httpRouter()

http.route({
  path: '/livekit/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const apiKey = env.LIVEKIT_API_KEY
    const apiSecret = env.LIVEKIT_API_SECRET
    if (!apiKey || !apiSecret) return new Response('Calls are not configured', { status: 503 })

    const body = await request.text()
    let event
    try {
      event = await new WebhookReceiver(apiKey, apiSecret).receive(body, request.headers.get('Authorization') ?? undefined)
    } catch {
      return new Response('Invalid signature', { status: 401 })
    }

    const room = event.room?.name
    if (!room) return new Response(null, { status: 200 })
    if (event.event === 'participant_left' && event.participant?.identity) {
      await ctx.runMutation(internal.calls.participantLeft, { room, identity: event.participant.identity })
    } else if (event.event === 'room_finished') {
      await ctx.runMutation(internal.calls.roomFinished, { room })
    }
    return new Response(null, { status: 200 })
  }),
})

export default http
