import { supabase } from './supabase';
import type { User, UserRole, UserStatus, AuditLog } from '../types';

const STORAGE_SESSION_KEY = 'uze_auth_active_session_v2';

class AuthService {
  private activeUser: User | null = null;

  constructor() {
    this.loadSessionFromStorage();
  }

  private loadSessionFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      if (stored) {
        this.activeUser = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[AuthService] Falha ao ler sessão local:', e);
    }
  }

  private saveSessionToStorage(user: User | null): void {
    this.activeUser = user;
    try {
      if (user) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch (e) {
      console.warn('[AuthService] Falha ao persistir sessão:', e);
    }
  }

  getActiveSession(): User | null {
    return this.activeUser;
  }

  clearSession(): void {
    this.saveSessionToStorage(null);
    supabase.auth.signOut().catch(() => {});
  }

  /**
   * Helper seguro para chamadas à API Administrativa
   */
  private async callAdminApi(actor: User, action: string, data?: any): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          actorId: actor.id,
          data,
        }),
      });

      const resJson = await response.json();
      return resJson;
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha de comunicação com o servidor administrativo.' };
    }
  }

  /**
   * Registra evento no log de auditoria
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
    } catch (e) {
      console.warn('[AuthService] Erro ao gravar log de auditoria:', e);
    }
  }

  /**
   * Autenticação Oficial com Supabase Auth
   */
  async login(emailRaw: string, passwordAttempt: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const email = emailRaw.trim().toLowerCase();

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: passwordAttempt,
      });

      if (authError || !authData.user) {
        await this.logAudit(
          { id: 'anonymous', name: 'Desconhecido', email },
          'auth.login.failed',
          undefined,
          { error: authError?.message || 'invalid_credentials' }
        );

        let errorMsg = 'Usuário ou senha incorretos.';
        if (authError?.message?.includes('Email not confirmed')) {
          errorMsg = 'E-mail não confirmado no Supabase Auth.';
        } else if (authError?.message?.includes('Invalid login credentials')) {
          errorMsg = 'Credenciais inválidas: e-mail ou senha incorretos no Supabase Auth.';
        } else if (authError?.message?.includes('User not found')) {
          errorMsg = 'Usuário não cadastrado no Supabase Auth.';
        } else if (authError?.message) {
          errorMsg = `Falha de autenticação: ${authError.message}`;
        }

        return { success: false, error: errorMsg };
      }

      const authUser = authData.user;

      // Busca perfil no banco de dados
      let { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      // Se profile não existir por algum motivo, recupera com base no auth user metadata
      if (!profile || profErr) {
        const meta = authUser.user_metadata || {};
        const fallbackRole = (meta.role || 'VENDEDOR') as UserRole;
        const fallbackStatus = (meta.status || 'Ativo') as UserStatus;
        const fallbackName = meta.name || email.split('@')[0];

        const { data: createdProfile } = await supabase
          .from('profiles')
          .upsert({
            id: authUser.id,
            name: fallbackName,
            email,
            role: fallbackRole,
            status: fallbackStatus,
            must_change_password: meta.must_change_password || false,
            created_at: authUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        profile = createdProfile;
      }

      if (!profile) {
        return { success: false, error: 'Perfil de usuário não localizado no sistema.' };
      }

      // Validação de Conta Ativa
      if (profile.status === 'Inativo') {
        await supabase.auth.signOut();
        await this.logAudit(
          { id: profile.id, name: profile.name, email: profile.email },
          'auth.login.blocked_inactive'
        );
        return {
          success: false,
          error: 'Esta conta está desativada. Entre em contato com o administrador da plataforma.',
        };
      }

      const appUser: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        status: profile.status as UserStatus,
        mustChangePassword: profile.must_change_password || false,
        lastLoginAt: new Date().toISOString(),
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        createdBy: profile.created_by,
      };

      // Atualiza last_login_at
      await supabase
        .from('profiles')
        .update({ last_login_at: appUser.lastLoginAt })
        .eq('id', profile.id);

      this.saveSessionToStorage(appUser);

      await this.logAudit(
        { id: appUser.id, name: appUser.name, email: appUser.email },
        'auth.login.success'
      );

      return { success: true, user: appUser };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro inesperado ao realizar login.' };
    }
  }

  /**
   * Altera a própria senha do usuário com validação OBRIGATÓRIA da senha atual contra o Supabase Auth
   */
  async changePasswordWithVerification(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.activeUser) {
      return { success: false, error: 'Sessão de usuário não identificada.' };
    }

    if (!currentPassword) {
      return { success: false, error: 'Informe a senha atual.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve conter pelo menos 6 caracteres.' };
    }

    if (newPassword === currentPassword) {
      return { success: false, error: 'A nova senha não pode ser igual à senha atual.' };
    }

    try {
      // 1. Validação REAL e segura da senha atual contra o Supabase Auth
      const { data: verifyData, error: verifyError } = await supabase.auth.signInWithPassword({
        email: this.activeUser.email,
        password: currentPassword,
      });

      if (verifyError || !verifyData.user) {
        return { success: false, error: 'Senha atual incorreta.' };
      }

      // 2. Atualização oficial da senha no Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (updateError) {
        return { success: false, error: `Falha ao atualizar senha: ${updateError.message}` };
      }

      // 3. Atualiza estado em profiles caso possuísse pendência de troca
      await supabase
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', this.activeUser.id);

      this.activeUser.mustChangePassword = false;
      this.saveSessionToStorage(this.activeUser);

      // 4. Registro de Auditoria PASSWORD_CHANGED (sem armazenar senha)
      await this.logAudit(
        { id: this.activeUser.id, name: this.activeUser.name, email: this.activeUser.email },
        'PASSWORD_CHANGED',
        undefined,
        { method: 'self_service_settings' }
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro inesperado ao alterar senha.' };
    }
  }

  /**
   * Conclui a recuperação de senha vinda de link por e-mail
   */
  async completePasswordRecovery(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve conter pelo menos 6 caracteres.' };
    }

    try {
      const { data: updatedData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (updateError) {
        return { success: false, error: updateError.message || 'Falha ao redefinir a nova senha.' };
      }

      const currentUserId = updatedData.user?.id || this.activeUser?.id;
      if (currentUserId) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq('id', currentUserId);
      }

      if (this.activeUser) {
        this.activeUser.mustChangePassword = false;
        this.saveSessionToStorage(this.activeUser);

        await this.logAudit(
          { id: this.activeUser.id, name: this.activeUser.name, email: this.activeUser.email },
          'PASSWORD_RESET_COMPLETED',
          undefined,
          { method: 'email_recovery_link' }
        );
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao processar redefinição de senha.' };
    }
  }

  /**
   * Dispara o envio oficial de e-mail de redefinição de senha para o usuário
   */
  async sendPasswordResetEmail(
    actor: User,
    targetUser: { id?: string; email: string; name?: string }
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const normalizedEmail = targetUser.email.trim().toLowerCase();
    const redirectToUrl = `${window.location.origin}/`;

    try {
      // Tenta primeiramente via backend administrativo
      const apiRes = await this.callAdminApi(actor, 'reset_email', {
        userId: targetUser.id,
        email: normalizedEmail,
        name: targetUser.name,
        redirectTo: redirectToUrl,
      });

      if (apiRes.success) {
        return { success: true, message: apiRes.message || `E-mail de redefinição enviado para ${normalizedEmail}.` };
      }

      // Fallback: Disparo direto via Supabase Auth client
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectToUrl,
      });

      if (resetErr) {
        return { success: false, error: resetErr.message || 'Erro ao solicitar redefinição de senha.' };
      }

      // Registra no log de auditoria
      await this.logAudit(
        { id: actor.id, name: actor.name, email: actor.email },
        'PASSWORD_RESET_REQUESTED',
        { id: targetUser.id, name: targetUser.name || normalizedEmail },
        { target_email: normalizedEmail, method: 'supabase_auth_direct_client' }
      );

      return { success: true, message: `E-mail de redefinição enviado com sucesso para ${normalizedEmail}.` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha de comunicação ao solicitar redefinição de senha.' };
    }
  }

  /**
   * Altera a própria senha do usuário logado (Primeiro acesso)
   */
  async changePassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (newPassword.length < 6) {
      return { success: false, error: 'A senha deve conter pelo menos 6 caracteres.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await supabase
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (this.activeUser && this.activeUser.id === userId) {
        this.activeUser.mustChangePassword = false;
        this.saveSessionToStorage(this.activeUser);
      }

      if (this.activeUser) {
        await this.logAudit(
          { id: this.activeUser.id, name: this.activeUser.name, email: this.activeUser.email },
          'PASSWORD_CHANGED',
          undefined,
          { method: 'first_login_onboarding' }
        );
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao alterar senha.' };
    }
  }

  /**
   * Lista todos os usuários cadastrados
   */
  async getUsers(actor: User): Promise<{ success: boolean; data?: User[]; error?: string }> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Tenta via backend admin API
        const apiRes = await this.callAdminApi(actor, 'list');
        if (apiRes.success && apiRes.data) {
          return {
            success: true,
            data: apiRes.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              email: p.email,
              role: p.role as UserRole,
              status: p.status as UserStatus,
              mustChangePassword: p.must_change_password || false,
              lastLoginAt: p.last_login_at,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              createdBy: p.created_by,
            })),
          };
        }
        return { success: false, error: error.message };
      }

      const users: User[] = (profiles || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role as UserRole,
        status: p.status as UserStatus,
        mustChangePassword: p.must_change_password || false,
        lastLoginAt: p.last_login_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        createdBy: p.created_by,
      }));

      return { success: true, data: users };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao listar usuários.' };
    }
  }

  /**
   * Criação Real de Usuário no Supabase Auth + Profiles
   */
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
    const res = await this.callAdminApi(actor, 'create', params);
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Erro ao criar usuário.' };
    }

    const p = res.data;
    const newUser: User = {
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role as UserRole,
      status: p.status as UserStatus,
      mustChangePassword: p.must_change_password || false,
      lastLoginAt: p.last_login_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      createdBy: p.created_by,
    };

    return { success: true, user: newUser };
  }

  /**
   * Atualização de Perfil de Usuário
   */
  async updateUser(
    actor: User,
    userId: string,
    params: { name: string; role: UserRole; status: UserStatus }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const res = await this.callAdminApi(actor, 'update', { userId, ...params });
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Erro ao atualizar usuário.' };
    }

    const p = res.data;
    const updatedUser: User = {
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role as UserRole,
      status: p.status as UserStatus,
      mustChangePassword: p.must_change_password || false,
      lastLoginAt: p.last_login_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      createdBy: p.created_by,
    };

    return { success: true, user: updatedUser };
  }

  /**
   * Ativação / Desativação de Conta
   */
  async updateUserStatus(
    actor: User,
    userId: string,
    newStatus: UserStatus
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.callAdminApi(actor, 'status', { userId, newStatus });
    if (!res.success) {
      return { success: false, error: res.error || 'Erro ao alterar status.' };
    }
    return { success: true };
  }

  /**
   * Redefinição Administrativa de Senha
   */
  async resetPassword(
    actor: User,
    userId: string,
    newPasswordRaw: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.callAdminApi(actor, 'password', { userId, newPassword: newPasswordRaw });
    if (!res.success) {
      return { success: false, error: res.error || 'Erro ao redefinir senha.' };
    }
    return { success: true };
  }

  /**
   * Remoção Real de Conta no Supabase Auth + Profiles
   */
  async deleteUser(
    actor: User,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.callAdminApi(actor, 'delete', { userId });
    if (!res.success) {
      return { success: false, error: res.error || 'Erro ao remover usuário.' };
    }
    return { success: true };
  }

  /**
   * Consulta Logs de Auditoria
   */
  async getAuditLogs(_actor: User): Promise<{ success: boolean; data?: AuditLog[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        return { success: false, error: error.message };
      }

      const logs: AuditLog[] = (data || []).map(row => ({
        id: row.id,
        actorId: row.actor_id,
        actorName: row.actor_name,
        actorEmail: row.actor_email,
        action: row.action,
        targetId: row.target_id,
        targetName: row.target_name,
        details: row.details,
        createdAt: row.created_at,
      }));

      return { success: true, data: logs };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao buscar logs de auditoria.' };
    }
  }

  /**
   * Bootstrap inicial idempotente
   */
  async initBootstrap(): Promise<void> {
    // Sincroniza sessão ativa atual se existir
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile && profile.status === 'Ativo') {
        this.saveSessionToStorage({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role as UserRole,
          status: profile.status as UserStatus,
          mustChangePassword: profile.must_change_password || false,
          lastLoginAt: profile.last_login_at,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          createdBy: profile.created_by,
        });
      }
    }
  }
}

export const authService = new AuthService();
