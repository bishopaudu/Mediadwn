export function getUserId() {
  let userId = localStorage.getItem('mediadwn_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('mediadwn_user_id', userId);
  }
  return userId;
}