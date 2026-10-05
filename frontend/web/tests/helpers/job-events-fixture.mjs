export function eventPage(items = [], options = {}) {
  return {
    protocol_version: 2,
    items: items.map(item => ({ event_id: `event-${item.seq}`, ...item })),
    limit: 500,
    next_cursor: "cursor-1",
    has_more: false,
    ...options,
  };
}
