// 🛡️ ALLOW LIST: Specific routes users can access even if they look like "Auth" or root
export const allowedProtectedPrefixes = [
    '(tabs)',
    'create-shop',
    'products',
    'sales',
    'settings',
    'notifications',
    'expenses',
    'reports',
    'profile',
    'stock',
    'select-shop',
    // ✅ Explicitly allow these auth-sub-routes for logged-in users
    '(auth)/add-product',
    '(auth)/edit-product',
    '(auth)/templates-products',
    '(auth)/cash-flow',
    '(auth)/manage-shop',
    '(auth)/create-shop',
];