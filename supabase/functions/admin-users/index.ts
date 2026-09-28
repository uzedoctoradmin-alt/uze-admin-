// ============================================================================
// SUPABASE EDGE FUNCTION: admin-users
// GERENCIAMENTO ADMINISTRATIVO SEGURO DE CONTAS (AUTH + PROFILES + AUDIT)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'list' | 'create' | 'update' | 'status' | 'password' | 'delete';
  actorId: string;
  data?: any;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chaves de ambiente do servidor não configuradas.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: RequestBody = await req.json();
    const { action, actorId, data } = body;

    // 1. Validação do Ator (Caller must be an active ADMINISTRADOR)
    if (!actorId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identificação do administrador requerida.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: actorProfile, error: actorErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', actorId)
      .maybeSingle();

    if (actorErr || !actorProfile || actorProfile.role !== 'ADMINISTRADOR' || actorProfile.status !== 'Ativo') {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão negada. Apenas administradores ativos podem executar esta ação.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- AÇÃO: LISTAR USUÁRIOS ---
    if (action === 'list') {
      const { data: profiles, error: pErr } = await adminClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;

      return new Response(
        JSON.stringify({ success: true, data: profiles }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- AÇÃO: CRIAR USUÁRIO ---
    if (action === 'create') {
      const { name, email, role, status, initialPassword } = data || {};

      if (!name || !email || !role || !initialPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'Todos os campos obrigatórios devem ser preenchidos.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Verifica se já existe em profiles
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Já existe um usuário cadastrado com este e-mail.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Cria usuário no Supabase Auth
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          role: role,
          status: status || 'Ativo',
          must_change_password: true,
        },
        app_metadata: {
          role: role,
        },
      });

      if (authError || !authData.user) {
        return new Response(
          JSON.stringify({ success: false, error: `Falha ao criar usuário no Supabase Auth: ${authError?.message || 'Erro desconhecido'}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newUserId = authData.user.id;

      // 2. Insere na tabela public.profiles garantindo id idêntico
      const { data: profileData, error: profileError } = await adminClient
        .from('profiles')
        .upsert({
          id: newUserId,
          name: name.trim(),
          email: normalizedEmail,
          role: role,
          status: status || 'Ativo',
          must_change_password: true,
          created_by: actorProfile.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        // Rollback / Compensação: Remove usuário do Auth para não deixar órfão
        await adminClient.auth.admin.deleteUser(newUserId);
        return new Response(
          JSON.stringify({ success: false, error: `Falha ao registrar perfil. O usuário no Auth foi revertido. Erro: ${profileError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Auditoria
      await adminClient.from('audit_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        actor_id: actorProfile.id,
        actor_name: actorProfile.name,
        actor_email: actorProfile.email,
        action: 'USER_CREATED',
        target_id: newUserId,
        target_name: name.trim(),
        details: { email: normalizedEmail, role, status },
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, data: profileData }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- AÇÃO: ATUALIZAR USUÁRIO ---
    if (action === 'update') {
      const { userId, name, role, status } = data || {};

      if (!userId || !name || !role) {
        return new Response(
          JSON.stringify({ success: false, error: 'Dados insuficientes para atualização.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Se estiver alterando o perfil ou status do último admin
      if (role !== 'ADMINISTRADOR' || status === 'Inativo') {
        const { data: activeAdmins } = await adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'ADMINISTRADOR')
          .eq('status', 'Ativo');

        if (activeAdmins && activeAdmins.length <= 1 && activeAdmins[0].id === userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Não é possível desativar ou remover privilégios do último administrador ativo da plataforma. Crie outro administrador antes de continuar.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // 1. Atualiza no Auth
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { name: name.trim(), role, status },
        app_metadata: { role },
      });

      // 2. Atualiza no profiles
      const { data: updatedProfile, error: updErr } = await adminClient
        .from('profiles')
        .update({
          name: name.trim(),
          role: role,
          status: status || 'Ativo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updErr) throw updErr;

      // 3. Auditoria
      await adminClient.from('audit_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        actor_id: actorProfile.id,
        actor_name: actorProfile.name,
        actor_email: actorProfile.email,
        action: 'USER_UPDATED',
        target_id: userId,
        target_name: name.trim(),
        details: { role, status },
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, data: updatedProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- AÇÃO: ALTERAR STATUS (DESATIVAR / REATIVAR) ---
    if (action === 'status') {
      const { userId, newStatus } = data || {};

      if (!userId || !newStatus) {
        return new Response(
          JSON.stringify({ success: false, error: 'Dados insuficientes.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newStatus === 'Inativo') {
        const { data: activeAdmins } = await adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'ADMINISTRADOR')
          .eq('status', 'Ativo');

        if (activeAdmins && activeAdmins.length <= 1 && activeAdmins[0].id === userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Não é possível desativar o último administrador ativo da plataforma. Crie outro administrador antes de continuar.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Atualiza no Auth e no Profile
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { status: newStatus },
      });

      const { data: updatedProfile, error: sErr } = await adminClient
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (sErr) throw sErr;

      await adminClient.from('audit_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        actor_id: actorProfile.id,
        actor_name: actorProfile.name,
        actor_email: actorProfile.email,
        action: newStatus === 'Inativo' ? 'USER_DISABLED' : 'USER_REACTIVATED',
        target_id: userId,
        target_name: updatedProfile?.name,
        details: { newStatus },
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, data: updatedProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- AÇÃO: REDEFINIR SENHA ---
    if (action === 'password') {
      const { userId, newPassword } = data || {};

      if (!userId || !newPassword || newPassword.length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'A senha deve conter no mínimo 6 caracteres.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: passErr } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
        user_metadata: { must_change_password: true },
      });

      if (passErr) throw passErr;

      await adminClient
        .from('profiles')
        .update({ must_change_password: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      await adminClient.from('audit_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        actor_id: actorProfile.id,
        actor_name: actorProfile.name,
        actor_email: actorProfile.email,
        action: 'USER_PASSWORD_RESET',
        target_id: userId,
        target_name: 'Usuário',
        details: { reset_by_admin: true },
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Senha redefinida com sucesso.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- AÇÃO: REMOVER USUÁRIO ---
    if (action === 'delete') {
      const { userId } = data || {};

      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'ID do usuário não informado.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Impede autoexclusão direta
      if (userId === actorProfile.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não é possível remover a própria conta durante a sessão ativa.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Proteção do último administrador
      const { data: activeAdmins } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'ADMINISTRADOR')
        .eq('status', 'Ativo');

      if (activeAdmins && activeAdmins.length <= 1 && activeAdmins[0].id === userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não é possível remover o último administrador ativo da plataforma. Crie outro administrador antes de continuar.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Busca dados antes de remover para auditoria
      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // 3. Remove no Supabase Auth
      const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delAuthErr) {
        return new Response(
          JSON.stringify({ success: false, error: `Falha ao remover usuário do Supabase Auth: ${delAuthErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 4. Remove do profiles (histórico de vendas, auditoria e estoque são preservados com autor)
      await adminClient.from('profiles').delete().eq('id', userId);

      // 5. Auditoria
      await adminClient.from('audit_logs').insert({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        actor_id: actorProfile.id,
        actor_name: actorProfile.name,
        actor_email: actorProfile.email,
        action: 'USER_REMOVED',
        target_id: userId,
        target_name: targetProfile?.name || 'Usuário Removido',
        details: { email: targetProfile?.email, role: targetProfile?.role },
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Usuário removido com sucesso.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Ação não reconhecida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
