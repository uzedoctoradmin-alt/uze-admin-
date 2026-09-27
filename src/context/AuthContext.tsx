import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User, UserRole, UserStatus, Permission, AuditLog } from '../types';
import { authService } from '../services/authService';
import { getRolePermissions, checkRoleHasPermission } from '../services/rbac';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  login: (email: string, passwordAttempt: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  
  // User Management
  usersList: User[];
  auditLogs: AuditLog[];
  refreshUsers: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
  createUser: (params: {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    initialPassword: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (
    userId: string,
    params: { name: string; role: UserRole; status: UserStatus }
  ) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (
    userId: string,
    temporaryPasswordRaw: string
  ) => Promise<{ success: boolean; error?: string }>;

  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Carrega sessão ativa e inicializa bootstrap
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        await authService.initBootstrap();
        const active = authService.getActiveSession();
        if (mounted && active) {
          setUser(active);
        }
      } catch (err) {
        console.error('[AuthContext] Erro ao carregar sessão:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshUsers = useCallback(async () => {
    if (!user || user.role !== 'ADMINISTRADOR') return;
    const res = await authService.getUsers(user);
    if (res.success && res.data) {
      setUsersList(res.data);
    }
  }, [user]);

  const refreshAuditLogs = useCallback(async () => {
    if (!user || user.role !== 'ADMINISTRADOR') return;
    const res = await authService.getAuditLogs(user);
    if (res.success && res.data) {
      setAuditLogs(res.data);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'ADMINISTRADOR') {
      refreshUsers();
      refreshAuditLogs();
    }
  }, [user, refreshUsers, refreshAuditLogs]);

  const permissions = useMemo<Permission[]>(() => {
    if (!user) return [];
    return getRolePermissions(user.role);
  }, [user]);

  const hasPermission = useCallback((perm: Permission): boolean => {
    if (!user) return false;
    return checkRoleHasPermission(user.role, perm);
  }, [user]);

  const login = async (email: string, passwordAttempt: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, passwordAttempt);
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true };
      }
      return { success: false, error: res.error || 'Usuário ou senha inválidos.' };
    } catch {
      return { success: false, error: 'Erro de comunicação ao autenticar.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    if (user) {
      authService.logAudit(
        { id: user.id, name: user.name, email: user.email },
        'auth.logout'
      );
    }
    authService.clearSession();
    setUser(null);
    setUsersList([]);
    setAuditLogs([]);
  }, [user]);

  const changePassword = async (newPassword: string) => {
    if (!user) return { success: false, error: 'Nenhum usuário logado.' };
    const res = await authService.changePassword(user.id, newPassword);
    if (res.success) {
      setUser(prev => (prev ? { ...prev, mustChangePassword: false } : null));
    }
    return res;
  };

  const createUser = async (params: {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    initialPassword: string;
  }) => {
    if (!user || user.role !== 'ADMINISTRADOR') {
      return { success: false, error: 'Acesso negado.' };
    }
    const res = await authService.createUser(user, params);
    if (res.success) {
      await refreshUsers();
      await refreshAuditLogs();
    }
    return res;
  };

  const updateUser = async (
    userId: string,
    params: { name: string; role: UserRole; status: UserStatus }
  ) => {
    if (!user || user.role !== 'ADMINISTRADOR') {
      return { success: false, error: 'Acesso negado.' };
    }
    const res = await authService.updateUser(user, userId, params);
    if (res.success) {
      // Se alterou o próprio usuário, atualiza a sessão local
      if (userId === user.id && res.user) {
        setUser(res.user);
      }
      await refreshUsers();
      await refreshAuditLogs();
    }
    return res;
  };

  const resetUserPassword = async (userId: string, temporaryPasswordRaw: string) => {
    if (!user || user.role !== 'ADMINISTRADOR') {
      return { success: false, error: 'Acesso negado.' };
    }
    const res = await authService.resetPassword(user, userId, temporaryPasswordRaw);
    if (res.success) {
      await refreshUsers();
      await refreshAuditLogs();
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        permissions,
        hasPermission,
        login,
        logout,
        changePassword,
        usersList,
        auditLogs,
        refreshUsers,
        refreshAuditLogs,
        createUser,
        updateUser,
        resetUserPassword,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
