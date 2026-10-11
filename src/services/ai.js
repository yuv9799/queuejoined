import api from './api.js';

export function sendAssistantMessage({ message = '', sessionId, action, tokenId }) {
  return api.aiChat({
    message,
    sessionId,
    action,
    context: tokenId ? { tokenId } : undefined,
  });
}
