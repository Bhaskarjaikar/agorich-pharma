// Browser Console में paste करें और run करें
// यह सभी Supabase-related keys find करेगा

console.log('=== PKCE Debugging ===\n');

// 1. localStorage keys
console.log('1. LOCALSTORAGE KEYS:');
const lsKeys = Object.keys(localStorage);
const supabaseLSKeys = lsKeys.filter(k => 
  k.includes('supabase') || 
  k.startsWith('sb-') || 
  k.includes('auth') || 
  k.includes('code_verifier') || 
  k.includes('pkce')
);
console.log('Total localStorage keys:', lsKeys.length);
console.log('Supabase-related keys:', supabaseLSKeys);
supabaseLSKeys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`  - ${key}:`, value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'null');
});

// 2. sessionStorage keys
console.log('\n2. SESSIONSTORAGE KEYS:');
const ssKeys = Object.keys(sessionStorage);
const supabaseSSKeys = ssKeys.filter(k => 
  k.includes('supabase') || 
  k.startsWith('sb-') || 
  k.includes('auth') || 
  k.includes('code_verifier') || 
  k.includes('pkce')
);
console.log('Total sessionStorage keys:', ssKeys.length);
console.log('Supabase-related keys:', supabaseSSKeys);
supabaseSSKeys.forEach(key => {
  const value = sessionStorage.getItem(key);
  console.log(`  - ${key}:`, value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'null');
});

// 3. Cookies
console.log('\n3. COOKIES:');
const cookies = document.cookie.split(';').map(c => c.trim());
const supabaseCookies = cookies.filter(c => 
  c.includes('supabase') || 
  c.startsWith('sb-') || 
  c.includes('auth')
);
console.log('Total cookies:', cookies.length);
console.log('Supabase-related cookies:', supabaseCookies);
supabaseCookies.forEach(cookie => {
  console.log(`  - ${cookie.substring(0, 50)}...`);
});

// 4. Current URL
console.log('\n4. CURRENT URL:');
console.log('Full URL:', window.location.href);
console.log('Search params:', new URLSearchParams(window.location.search).toString());
console.log('Hash:', window.location.hash);

console.log('\n=== Copy above output and share ===');




