export const PROTOCOL_DRAFT_VERSION = 1;
export const PROTOCOL_DRAFT_KEY_PREFIX = 'treinoway:protocol-builder-draft:';

/**
 * Draft key is scoped per studentId so drafts for different students never
 * collide (a trainer may start "new routine" flows for several students
 * without ever completing/discarding one before starting the next).
 */
export const getProtocolDraftKey = (studentId) => `${PROTOCOL_DRAFT_KEY_PREFIX}${studentId}`;
