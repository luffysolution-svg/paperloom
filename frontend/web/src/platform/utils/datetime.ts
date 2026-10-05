const zhDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const zhDateCompactFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

const zhDateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatZhDate(value: Date | number): string {
  return zhDateFormatter.format(value);
}

export function formatZhDateCompact(value: Date | number): string {
  return zhDateCompactFormatter.format(value);
}

export function formatZhDateTime(value: Date | number): string {
  return zhDateTimeFormatter.format(value);
}
