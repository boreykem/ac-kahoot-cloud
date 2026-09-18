/**
 * Multi-Account Storage & Switcher Utility
 * Manages 1-Click Fast Switching across multiple teacher/admin profiles
 */

export function getSavedAccounts() {
  try {
    const raw = localStorage.getItem('saved_accounts');
    const list = raw ? JSON.parse(raw) : [];
    
    // Also include current user if not in list
    const currentRaw = localStorage.getItem('auth_user');
    if (currentRaw) {
      const cur = JSON.parse(currentRaw);
      if (cur && cur.email) {
        const found = list.some(a => a.email?.toLowerCase() === cur.email.toLowerCase());
        if (!found) {
          list.unshift({ ...cur, lastActive: Date.now() });
          localStorage.setItem('saved_accounts', JSON.stringify(list));
        }
      }
    }
    return list;
  } catch {
    return [];
  }
}

export function saveAccount(user) {
  if (!user || !user.email) return;
  try {
    const accounts = getSavedAccounts();
    const emailLower = user.email.toLowerCase().trim();
    const existingIndex = accounts.findIndex(a => a.email?.toLowerCase().trim() === emailLower);
    
    const accountObj = {
      id: user.id || `u_${Date.now()}`,
      name: user.name || 'លោកគ្រូ/អ្នកគ្រូ',
      email: user.email.trim(),
      school: user.school || '',
      avatar: user.avatar || '👨‍🏫',
      license: user.license || 'free',
      aiGenerationsCount: user.aiGenerationsCount || 0,
      role: user.role || 'user',
      lastActive: Date.now(),
      token: user.token || undefined
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...accountObj };
    } else {
      accounts.unshift(accountObj);
    }

    localStorage.setItem('saved_accounts', JSON.stringify(accounts));
    localStorage.setItem('auth_user', JSON.stringify(accountObj));
  } catch (e) {
    console.error('Failed to save account', e);
  }
}

export function removeSavedAccount(email) {
  if (!email) return [];
  try {
    const emailLower = email.toLowerCase().trim();
    const accounts = getSavedAccounts().filter(a => a.email?.toLowerCase().trim() !== emailLower);
    localStorage.setItem('saved_accounts', JSON.stringify(accounts));
    
    // If current active user was removed, set next active or null
    const currentRaw = localStorage.getItem('auth_user');
    if (currentRaw) {
      const cur = JSON.parse(currentRaw);
      if (cur && cur.email?.toLowerCase().trim() === emailLower) {
        if (accounts.length > 0) {
          localStorage.setItem('auth_user', JSON.stringify(accounts[0]));
        } else {
          localStorage.removeItem('auth_user');
        }
      }
    }
    return accounts;
  } catch {
    return [];
  }
}
