import type { MessageHandler, HandlerContext } from '../types';

// Common handlers shared across domains (ping, echo, etc.).
// Scaffold — populated as concrete cross-cutting handlers are identified.
export function createCommonHandlers(ctx: HandlerContext): Record<string, MessageHandler> {
  return {
    PING: async () => {
      ctx.sendToWebview({ mode: 'PONG', data: { at: Date.now() } });
    },
  };
}
