const KEY = "reput_splash_shown";

export function isFirstVisit(): boolean {
  try {
    if (localStorage.getItem(KEY)) return false;
    localStorage.setItem(KEY, "true");
    return true;
  } catch {
    return false;
  }
}
