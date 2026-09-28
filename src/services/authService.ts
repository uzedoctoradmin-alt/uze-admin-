import { supabase } from './supabase';
import { hashPassword, verifyPassword, generateSalt, validatePasswordRequirements } from './authCrypto';
import type { User, DatabaseUser, UserRole, UserStatus, AuditLog } from '../types';

const STORAGE_USERS_KEY = 'uze_auth_users_store_v1';
const STORAGE_LOGS_KEY = 'uze_auth_audit_logs_v1';
const STORAGE_SESSION_KEY = 'uze_auth_active_session_v1';

// Bootstrap inicial seguro a partir de variáveis de ambiente
const INITIAL_ADMIN_EMAIL = (import.meta.env.VITE_INITIAL_ADMIN_EMAIL || 'JOTAJOAO29@GMAIL.COM').trim().toLowerCase();
const INITIAL_ADMIN_PASSWORD = import.meta.env.VITE_INITIAL_ADMIN_PASSWORD || 'UzeDoctorAdmin2026!';

class AuthService {
  private localUsers: DatabaseUser[] = [];
  private localLogs: AuditLog[] = [];
  private initialized: boolean = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const storedUsers = localStorage.getItem(STORAGE_USERS_KEY);
      if (storedUsers) {
        this.localUsers = JSON.parse(storedUsers);
      }
      const storedLogs = localStorage.getItem(STORAGE_LOGS_KEY);
      if (storedLogs) {
        this.localLogs = JSON.parse(storedLogs);
      }
    } catch (e) {
      console.warn('[AuthService] Falha ao carregar storage local:', e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.localUsers));
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(this.localLogs));
    } catch (e) {
      console.warn('[AuthService] Falha ao salvar storage local:', e);
    }
  }

  /**
   * Sanitiza usuário removendo hash e salt antes de expor para o frontend
   */
  private sanitizeUser(dbUser: DatabaseUser): User {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
      mustChangePassword: dbUser.mustChangePassword,
      lastLoginAt: dbUser.lastLoginAt,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      createdBy: dbUser.createdBy,
    };
  }

  /**
   * Registra log de auditoria
   */
  async logAudit(
    actor: { id: string; name: string; email: string },
    action: string,
    target?: { id?: string; name?: string },
    details?: Record<string, any>
  ): Promise<void> {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action,
      targetId: target?.id,
      targetName: target?.name,
      details,
      createdAt: new Date().toISOString(),
    };

    this.localLogs.unshift(log);
    if (this.localLogs.length > 200) {
      this.localLogs = this.localLogs.slice(0, 200);
    }
    this.saveToLocalStorage();

    // Sincroniza log com o Supabase se tabela existir
    try {
      await supabase.from('audit_logs').insert({
        id: log.id,
        actor_id: log.actorId,
        actor_name: log.actorName,
        actor_email: log.actorEmail,
        action: log.action,
        target_id: log.targetId,
        target_name: log.targetName,
        details: log.details,
        created_at: log.createdAt,
      });
    } catch {
      // Ignora erro remoto de log
    }
  }

  /**
   * Inicialização e Bootstrap Idempotente do Administrador
   */
  async initBootstrap(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Tentar ler do Supabase
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data && data.length > 0) {
        this.localUsers = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email.toLowerCase(),
          passwordHash: row.password_hash,
          salt: row.salt,
          role: row.role as UserRole,
          status: row.status as UserStatus,
          mustChangePassword: row.must_change_password,
          lastLoginAt: row.last_login_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
        }));
        this.saveToLocalStorage();
      }
    } catch (err) {
      console.warn('[AuthService] Supabase users query failed, using local store:', err);
    }

    // 2. Verificar se o Administrador inicial já existe (case-insensitive)
    const adminExists = this.localUsers.some(
      u => u.email.toLowerCase() === INITIAL_ADMIN_EMAIL && u.role === 'ADMINISTRADOR'
    );

    if (!adminExists) {
      const salt = generateSalt();
      const passwordHash = await hashPassword(INITIAL_ADMIN_PASSWORD, salt);
      const now = new Date().toISOString();

      const initialAdmin: DatabaseUser = {
        id: 'usr-admin-bootstrap',
        name: 'Administrador UZE DOCTOR',
        email: INITIAL_ADMIN_EMAIL,
        passwordHash,
        salt,
        role: 'ADMINISTRADOR',
        status: 'Ativo',
        mustChangePassword: true,
        createdAt: now,
        updatedAt: now,
        createdBy: 'Sistema Bootstrap',
      };

      this.localUsers.unshift(initialAdmin);
      this.saveToLocalStorage();

      // Salva no Supabase se possível
      try {
        await supabase.from('users').insert({
          id: initialAdmin.id,
          name: initialAdmin.name,
          email: initialAdmin.email,
          password_hash: initialAdmin.passwordHash,
          salt: initialAdmin.salt,
          role: initialAdmin.role,
          status: initialAdmin.status,
          must_change_password: initialAdmin.mustChangePassword,
          created_at: initialAdmin.createdAt,
          updated_at: initialAdmin.updatedAt,
          created_by: initialAdmin.createdBy,
        });
      } catch {
        // Tabela ainda pode não ter sido executada no Supabase
      }

      await this.logAudit(
        { id: 'system', name: 'Bootstrap', email: 'system@uzedoctor.internal' },
        'user.bootstrap.admin',
        { id: initialAdmin.id, name: initialAdmin.name }
      );
    }
  }

  /**
   * Autenticação de Usuário (Login)
   */
  async login(emailRaw: string, passwordAttempt: string): Promise<{ success: boolean; error?: string; user?: User }> {
    await this.initBootstrap();

    const email = emailRaw.trim().toLowerCase();

    // 1. Tentar login oficial via Supabase Auth se configurado
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: passwordAttempt,
      });

      if (!authErr && authData?.user) {
        const u = authData.user;
        const role = (u.user_metadata?.role || u.app_metadata?.role || 'ADMINISTRADOR') as UserRole;
        const name = u.user_metadata?.name || 'Administrador UZE DOCTOR';
        const mustChange = Boolean(u.user_metadata?.must_change_password);

        const safeUser: User = {
          id: u.id,
          name,
          email: u.email?.toLowerCase() || email,
          role,
          status: 'Ativo',
          mustChangePassword: mustChange,
          lastLoginAt: new Date().toISOString(),
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        };

        this.saveSession(safeUser);
        await this.logAudit(
          { id: safeUser.id, name: safeUser.name, email: safeUser.email },
          'auth.login.success'
        );

        return { success: true, user: safeUser };
      }
    } catch {
      // Falha na rede do Supabase Auth -> segue para verificação do store
    }

    // 2. Buscar no banco local/remoto users
    let dbUser = this.localUsers.find(u => u.email.toLowerCase() === email);

    // Tentar buscar no Supabase se não achar localmente
    if (!dbUser) {
      try {
        const { data } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
        if (data) {
          dbUser = {
            id: data.id,
            name: data.name,
            email: data.email.toLowerCase(),
            passwordHash: data.password_hash,
            salt: data.salt,
            role: data.role,
            status: data.status,
            mustChangePassword: data.must_change_password,
            lastLoginAt: data.last_login_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            createdBy: data.created_by,
          };
          this.localUsers.push(dbUser);
          this.saveToLocalStorage();
        }
      } catch {
        // ignore
      }
    }

    // Mensagem genérica para evitar enumeração de contas existentes
    if (!dbUser) {
      await this.logAudit(
        { id: 'anon', name: 'Anônimo', email },
        'auth.login.failed',
        undefined,
        { reason: 'user_not_found' }
      );
      return { success: false, error: 'Usuário ou senha inválidos.' };
    }

    // Validação de status da conta
    if (dbUser.status !== 'Ativo') {
      await this.logAudit(
        { id: dbUser.id, name: dbUser.name, email: dbUser.email },
        'auth.login.blocked',
        undefined,
        { status: dbUser.status }
      );
      return {
        success: false,
        error: 'Sua conta está indisponível. Procure o administrador do sistema.',
      };
    }

    // Verificação de senha com hash e salt
    const isPasswordValid = await verifyPassword(passwordAttempt, dbUser.salt, dbUser.passwordHash);

    if (!isPasswordValid) {
      await this.logAudit(
        { id: dbUser.id, name: dbUser.name, email: dbUser.email },
        'auth.login.failed',
        undefined,
        { reason: 'invalid_password' }
      );
      return { success: false, error: 'Usuário ou senha inválidos.' };
    }

    // Sucesso: atualizar último acesso
    const now = new Date().toISOString();
    dbUser.lastLoginAt = now;
    this.saveToLocalStorage();

    try {
      await supabase.from('users').update({ last_login_at: now }).eq('id', dbUser.id);
    } catch {
      // ignore
    }

    await this.logAudit(
      { id: dbUser.id, name: dbUser.name, email: dbUser.email },
      'auth.login.success'
    );

    const safeUser = this.sanitizeUser(dbUser);
    this.saveSession(safeUser);

    return { success: true, user: safeUser };
  }

  /**
   * Sessão ativa do usuário
   */
  saveSession(user: User): void {
    try {
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  getActiveSession(): User | null {
    try {
      const data = sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      // Validar se o usuário ainda existe e está ativo no store
      const dbUser = this.localUsers.find(u => u.id === parsed.id);
      if (dbUser) {
        if (dbUser.status !== 'Ativo') {
          this.clearSession();
          return null;
        }
        return this.sanitizeUser(dbUser);
      }
      return parsed;
    } catch {
      return null;
    }
  }

  clearSession(): void {
    try {
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem('uze_auth_token');
    } catch {
      // ignore
    }
  }

  /**
   * Alteração de Senha (pelo próprio usuário no primeiro login ou voluntariamente)
   */
  async changePassword(userId: string, newPasswordRaw: string): Promise<{ success: boolean; error?: string }> {
    const val = validatePasswordRequirements(newPasswordRaw);
    if (!val.isValid) {
      return { success: false, error: val.message };
    }

    const session = this.getActiveSession();
    let userIndex = this.localUsers.findIndex(u => u.id === userId);
    if (userIndex === -1 && session) {
      userIndex = this.localUsers.findIndex(u => u.email.toLowerCase() === session.email.toLowerCase());
    }

    // 1. Atualizar no Supabase Auth
    try {
      await supabase.auth.updateUser({
        password: newPasswordRaw,
        data: { must_change_password: false },
      });
    } catch {
      // ignore
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPasswordRaw, newSalt);
    const now = new Date().toISOString();

    let safeUser: User;
    if (userIndex !== -1) {
      const targetUser = this.localUsers[userIndex];
      targetUser.passwordHash = newHash;
      targetUser.salt = newSalt;
      targetUser.mustChangePassword = false;
      targetUser.updatedAt = now;
      this.saveToLocalStorage();
      safeUser = this.sanitizeUser(targetUser);
    } else if (session) {
      safeUser = {
        ...session,
        id: userId,
        mustChangePassword: false,
        updatedAt: now,
      };
      this.localUsers.push({
        ...safeUser,
        passwordHash: newHash,
        salt: newSalt,
      });
      this.saveToLocalStorage();
    } else {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    // Atualiza na sessão ativa
    this.saveSession(safeUser);

    try {
      await supabase.from('users').update({
        password_hash: newHash,
        salt: newSalt,
        must_change_password: false,
        updated_at: now,
      }).eq('id', userId);
    } catch {
      // ignore
    }

    try {
      await supabase.from('profiles').update({
        must_change_password: false,
        updated_at: now,
      }).eq('id', userId);
    } catch {
      // ignore
    }

    await this.logAudit(
      { id: safeUser.id, name: safeUser.name, email: safeUser.email },
      'password.changed',
      { id: safeUser.id, name: safeUser.name }
    );

    return { success: true };
  }

  // ============================================================================
  // GERENCIAMENTO DE USUÁRIOS (PRIVILÉGIO EXCLUSIVO DE ADMINISTRADOR)
  // ============================================================================

  async getUsers(actor: User): Promise<{ success: boolean; data?: User[]; error?: string }> {
    if (actor.role !== 'ADMINISTRADOR') {
      return { success: false, error: 'Acesso negado: privilégio de administrador necessário.' };
    }
    await this.initBootstrap();
    return {
      success: true,
      data: this.localUsers.map(u => this.sanitizeUser(u)),
    };
  }

  async createUser(
    actor: User,
    params: {
      name: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      initialPassword: string;
    }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (actor.role !== 'ADMINISTRADOR') {
      return { success: false, error: 'Acesso negado: apenas Administradores podem criar contas.' };
    }

    const email = params.email.trim().toLowerCase();
    if (!params.name.trim() || !email) {
      return { success: false, error: 'Nome e E-mail são obrigatórios.' };
    }

    const val = validatePasswordRequirements(params.initialPassword);
    if (!val.isValid) {
      return { success: false, error: val.message };
    }

    // Verificar unicidade de e-mail (case-insensitive)
    const exists = this.localUsers.some(u => u.email.toLowerCase() === email);
    if (exists) {
      return { success: false, error: 'Já existe um usuário cadastrado com este e-mail.' };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(params.initialPassword, salt);
    const now = new Date().toISOString();
    const newId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newUser: DatabaseUser = {
      id: newId,
      name: params.name.trim(),
      email,
      passwordHash,
      salt,
      role: params.role,
      status: params.status,
      mustChangePassword: true, // Sempre exigir troca no primeiro login
      createdAt: now,
      updatedAt: now,
      createdBy: actor.email,
    };

    this.localUsers.push(newUser);
    this.saveToLocalStorage();

    try {
      await supabase.from('users').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        password_hash: newUser.passwordHash,
        salt: newUser.salt,
        role: newUser.role,
        status: newUser.status,
        must_change_password: newUser.mustChangePassword,
        created_at: newUser.createdAt,
        updated_at: newUser.updatedAt,
        created_by: newUser.createdBy,
      });
    } catch {
      // ignore
    }

    await this.logAudit(
      { id: actor.id, name: actor.name, email: actor.email },
      'user.created',
      { id: newUser.id, name: newUser.name },
      { role: newUser.role, status: newUser.status }
    );

    return { success: true, user: this.sanitizeUser(newUser) };
  }

  async updateUser(
    actor: User,
    userId: string,
    params: {
      name: string;
      role: UserRole;
      status: UserStatus;
    }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (actor.role !== 'ADMINISTRADOR') {
      return { success: false, error: 'Acesso negado: apenas Administradores podem editar contas.' };
    }

    const userIndex = this.localUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const current = this.localUsers[userIndex];

    // REGRA DE PROTEÇÃO DO ÚLTIMO ADMINISTRADOR
    if (current.role === 'ADMINISTRADOR' && (params.role !== 'ADMINISTRADOR' || params.status !== 'Ativo')) {
      const activeAdminsCount = this.localUsers.filter(
        u => u.role === 'ADMINISTRADOR' && u.status === 'Ativo' && u.id !== userId
      ).length;

      if (activeAdminsCount === 0) {
        return {
          success: false,
          error: 'Operação não permitida: o sistema precisa manter ao menos um Administrador ativo.',
        };
      }
    }

    const now = new Date().toISOString();
    current.name = params.name.trim();
    current.role = params.role;
    current.status = params.status;
    current.updatedAt = now;

    this.saveToLocalStorage();

    try {
      await supabase.from('users').update({
        name: current.name,
        role: current.role,
        status: current.status,
        updated_at: now,
      }).eq('id', userId);
    } catch {
      // ignore
    }

    await this.logAudit(
      { id: actor.id, name: actor.name, email: actor.email },
      'user.updated',
      { id: current.id, name: current.name },
      { newRole: params.role, newStatus: params.status }
    );

    return { success: true, user: this.sanitizeUser(current) };
  }

  async resetPassword(
    actor: User,
    userId: string,
    temporaryPasswordRaw: string
  ): Promise<{ success: boolean; error?: string }> {
    if (actor.role !== 'ADMINISTRADOR') {
      return { success: false, error: 'Acesso negado: apenas Administradores podem redefinir senhas.' };
    }

    const val = validatePasswordRequirements(temporaryPasswordRaw);
    if (!val.isValid) {
      return { success: false, error: val.message };
    }

    const targetUser = this.localUsers.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(temporaryPasswordRaw, salt);
    const now = new Date().toISOString();

    targetUser.passwordHash = hash;
    targetUser.salt = salt;
    targetUser.mustChangePassword = true; // Exigir troca no próximo login
    targetUser.updatedAt = now;

    this.saveToLocalStorage();

    try {
      await supabase.from('users').update({
        password_hash: hash,
        salt,
        must_change_password: true,
        updated_at: now,
      }).eq('id', userId);
    } catch {
      // ignore
    }

    await this.logAudit(
      { id: actor.id, name: actor.name, email: actor.email },
      'user.password_reset_by_admin',
      { id: targetUser.id, name: targetUser.name }
    );

    return { success: true };
  }

  async getAuditLogs(actor: User): Promise<{ success: boolean; data?: AuditLog[]; error?: string }> {
    if (actor.role !== 'ADMINISTRADOR') {
      return { success: false, error: 'Acesso negado aos registros de auditoria.' };
    }
    return { success: true, data: [...this.localLogs] };
  }
}

export const authService = new AuthService();
