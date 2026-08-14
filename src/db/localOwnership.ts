const KEY = "fla-mpm:localOwnerId";
export const getLocalOwner = (): string | null => localStorage.getItem(KEY);
export const setLocalOwner = (userId: string): void => { localStorage.setItem(KEY, userId); };
export const clearLocalOwner = (): void => { localStorage.removeItem(KEY); };
