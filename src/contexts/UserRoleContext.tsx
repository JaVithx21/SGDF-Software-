'use client';

import { createContext, useContext } from 'react';
import type { UserRole } from '@/constants/roles';

// ─── Context ────────────────────────────────────────────────────────────────

interface UserRoleContextValue {
    role: UserRole;
}

const UserRoleContext = createContext<UserRoleContextValue>({ role: 'vendedor' });

// ─── Provider (usado en layout) ─────────────────────────────────────────────

export function UserRoleProvider({
    role,
    children,
}: {
    role: UserRole;
    children: React.ReactNode;
}) {
    return (
        <UserRoleContext.Provider value={{ role }}>
            {children}
        </UserRoleContext.Provider>
    );
}

// ─── Hook (usado en cada módulo) ────────────────────────────────────────────

export function useUserRole(): UserRole {
    return useContext(UserRoleContext).role;
}

// ─── Helper: check if user CAN do something ─────────────────────────────────

export function canAccess(role: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(role);
}
