/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SUBJECTS = [
  'Қазақ тілі мен әдебиеті',
  'Математика / Алгебра / Геометрия',
  'Қазақстан тарихы / Дүниежүзі тарихы',
  'География / Жаратылыстану',
  'Физика',
  'Химия',
  'Биология',
  'Информатика',
  'Бастауыш сынып пәндері',
  'Балабақшадағы дамыту ойындары',
  'Тәрбие сағаты / Сынып сағаты'
];

export const GRADES = [
  'Балабақша (Кіші топ)',
  'Балабақша (Ересек топ)',
  'Мектеп алды даярлық',
  '1-сынып', '2-сынып', '3-сынып', '4-сынып',
  '5-сынып', '6-сынып', '7-сынып', '8-сынып', '9-сынып',
  '10-сынып', '11-сынып'
];

export const DIFFICULTIES = [
  'Жеңіл (Базалық)',
  'Орташа (Стандартты)',
  'Қиын (Олимпиадалық / Тереңдетілген)'
];

export const QUARTERS = [
  '1-тоқсан',
  '2-тоқсан',
  '3-тоқсан',
  '4-тоқсан'
];

export const BLOOM_LEVELS = [
  'Білу және түсіну',
  'Қолдану',
  'Талдау және жинақтау',
  'Бағалау',
  'Барлық деңгейлер (Блум таксономиясы аралас)'
];

/**
 * Namespaces a localStorage key by the currently logged-in teacher's user id
 * (set by AuthContext on login), so materials, chat history, and settings
 * saved on a shared/staff-room computer don't leak between accounts.
 * Falls back to the bare key if no one is logged in yet.
 */
export function scopedKey(baseKey: string): string {
  const userId = localStorage.getItem('ustaz_current_user_id');
  return userId ? `${baseKey}__${userId}` : baseKey;
}
