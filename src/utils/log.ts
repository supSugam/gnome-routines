// Set to false for production to disable logs
const DEBUG = false;

export default function debugLog(message: string, ...args: any[]) {
  if (!DEBUG) return;

  // HH:MM:SS{AM/PM} in 12 hour format eg: [01:23:45 PM]
  const d = new Date();
  const hours24 = d.getHours();
  const hh = String(hours24 % 12 || 12).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  console.log(`[${hh}:${mm}:${ss}${ampm}] ${message}`, ...args);
}
