/**
 * 把会议里的相对日期说法（"下周一前""这周五""明天""next Friday"）换算成具体日期。
 *
 * 为什么不让模型自己算：小模型做日期推算经常差一天（实测把"下周一"算成了周日）。
 * 更可靠的分工是：模型负责从原文里"找出"截止日期的说法，代码负责"计算"日期。
 * 识别不了的说法返回 null，这时才退回使用模型给出的日期。
 */

const CN_WEEKDAY: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
const EN_WEEKDAY: Record<string, number> = {
  monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6, sunday: 7, sun: 7,
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** 周一=1 … 周日=7 */
const isoWeekday = (d: Date) => ((d.getUTCDay() + 6) % 7) + 1;

/**
 * weekOffset：0=本周，1=下周，2=下下周；null=没说哪一周（取今天之后最近的那一天）
 */
function weekdayDate(base: Date, weekday: number, weekOffset: number | null) {
  const today = isoWeekday(base);
  if (weekOffset === null) {
    const diff = (weekday - today + 7) % 7;
    return addDays(base, diff === 0 ? 7 : diff);
  }
  const monday = addDays(base, 1 - today);
  return addDays(monday, weekOffset * 7 + weekday - 1);
}

export function resolveDuePhrase(phrase: string, meetingDate: string): string | null {
  const base = new Date(`${meetingDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  const text = phrase.trim().toLowerCase();
  if (!text) return null;

  // 中文：今天 / 明天 / 后天
  if (/今天|今日/.test(text)) return iso(base);
  if (/大后天/.test(text)) return iso(addDays(base, 3));
  if (/后天/.test(text)) return iso(addDays(base, 2));
  if (/明天|明日/.test(text)) return iso(addDays(base, 1));

  // 中文：(下下|下|这|本)?(周|星期|礼拜)X
  const cn = text.match(/(下下|下个?|这个?|本)?(周|星期|礼拜)([一二三四五六日天])/);
  if (cn) {
    const prefix = cn[1] ?? "";
    const offset = prefix.startsWith("下下") ? 2 : prefix.startsWith("下") ? 1 : prefix ? 0 : null;
    return iso(weekdayDate(base, CN_WEEKDAY[cn[3]], offset));
  }

  // English: today / tomorrow / (this|next)? weekday
  if (/\btoday\b|\beod\b/.test(text)) return iso(base);
  if (/\btomorrow\b/.test(text)) return iso(addDays(base, 1));
  const en = text.match(/\b(this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thurs?|fri|sat|sun)\b/);
  if (en) {
    const offset = en[1] === "next" ? 1 : en[1] === "this" ? 0 : null;
    return iso(weekdayDate(base, EN_WEEKDAY[en[2]], offset));
  }

  return null;
}
