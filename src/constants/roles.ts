export type UserRole = 'admin' | 'gerente' | 'vendedor';

export interface SidebarItem {
    key: string;
    label: string;
    href: string;
    icon: string;
    roles: UserRole[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
    { key: 'dashboard', label: 'Panel de Control', href: '/dashboard', icon: 'LayoutDashboard', roles: ['admin', 'gerente', 'vendedor'] },
    { key: 'inventario', label: 'Inventario', href: '/inventario', icon: 'Package', roles: ['admin', 'gerente', 'vendedor'] },
    { key: 'movimientos', label: 'Movimientos', href: '/movimientos', icon: 'ArrowLeftRight', roles: ['admin', 'gerente', 'vendedor'] },
    { key: 'clientes', label: 'Clientes', href: '/clientes', icon: 'Users', roles: ['admin', 'gerente', 'vendedor'] },
    { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: 'ShoppingCart', roles: ['admin', 'gerente', 'vendedor'] },
    { key: 'finanzas', label: 'Finanzas', href: '/finanzas', icon: 'DollarSign', roles: ['admin', 'gerente', 'vendedor'] },
    { key: 'administracion', label: 'Administración', href: '/administracion', icon: 'Settings', roles: ['admin'] },
];

/** Rutas protegidas por rol — usadas en middleware (OWASP A01) */
export const ROLE_PROTECTED_ROUTES: { prefix: string; roles: UserRole[] }[] = [
    { prefix: '/administracion', roles: ['admin'] },
];

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Administrador',
    gerente: 'Gerente',
    vendedor: 'Vendedor',
};
