import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createClient } from '@supabase/supabase-js';

function adminApiPlugin(env: Record<string, string>): Plugin {
  const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xpjlixvifoytxgplesnq.supabase.co';
  const SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return {
    name: 'admin-api-backend-plugin',
    configureServer(server) {
      server.middlewares.use('/api/admin/users', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        if (!SUPABASE_SECRET_KEY) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          return res.end(JSON.stringify({ 
            success: false, 
            error: 'Chave de serviço do Supabase (SUPABASE_SECRET_KEY) não configurada no arquivo .env.' 
          }));
        }

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        let bodyRaw = '';
        req.on('data', chunk => {
          bodyRaw += chunk;
        });

        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');

          try {
            const body = bodyRaw ? JSON.parse(bodyRaw) : {};
            const { action, actorId, data } = body;

            // 1. Validação do Ator (Caller must be an active ADMINISTRADOR)
            if (!actorId) {
              res.statusCode = 401;
              return res.end(JSON.stringify({ success: false, error: 'Identificação do administrador requerida.' }));
            }

            const { data: actorProfile, error: actorErr } = await adminClient
              .from('profiles')
              .select('*')
              .eq('id', actorId)
              .maybeSingle();

            if (actorErr || !actorProfile || actorProfile.role !== 'ADMINISTRADOR' || actorProfile.status !== 'Ativo') {
              res.statusCode = 403;
              return res.end(JSON.stringify({ success: false, error: 'Permissão negada. Apenas administradores ativos podem executar esta ação.' }));
            }

            // --- AÇÃO: LISTAR USUÁRIOS ---
            if (action === 'list') {
              const { data: profiles, error: pErr } = await adminClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

              if (pErr) throw pErr;

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, data: profiles }));
            }

            // --- AÇÃO: CRIAR USUÁRIO ---
            if (action === 'create') {
              const { name, email, role, status, initialPassword } = data || {};

              if (!name || !email || !role || !initialPassword) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Todos os campos obrigatórios devem ser preenchidos.' }));
              }

              const normalizedEmail = email.trim().toLowerCase();

              // Verifica se já existe em profiles
              const { data: existingProfile } = await adminClient
                .from('profiles')
                .select('id')
                .eq('email', normalizedEmail)
                .maybeSingle();

              if (existingProfile) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Já existe um usuário cadastrado com este e-mail.' }));
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

              if (authError || !authData?.user) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: `Falha ao criar usuário no Supabase Auth: ${authError?.message || 'Erro desconhecido'}` }));
              }

              const newUserId = authData.user.id;

              // 2. Insere na tabela public.profiles com o mesmo ID
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
                // Rollback / Compensação
                await adminClient.auth.admin.deleteUser(newUserId);
                res.statusCode = 500;
                return res.end(JSON.stringify({ success: false, error: `Falha ao salvar perfil. Criação revertida: ${profileError.message}` }));
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

              res.statusCode = 201;
              return res.end(JSON.stringify({ success: true, data: profileData }));
            }

            // --- AÇÃO: ATUALIZAR USUÁRIO ---
            if (action === 'update') {
              const { userId, name, role, status } = data || {};

              if (!userId || !name || !role) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Dados insuficientes para atualização.' }));
              }

              if (role !== 'ADMINISTRADOR' || status === 'Inativo') {
                const { data: activeAdmins } = await adminClient
                  .from('profiles')
                  .select('id')
                  .eq('role', 'ADMINISTRADOR')
                  .eq('status', 'Ativo');

                if (activeAdmins && activeAdmins.length <= 1 && activeAdmins[0].id === userId) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ success: false, error: 'Não é possível desativar ou remover privilégios do último administrador ativo da plataforma. Crie outro administrador antes de continuar.' }));
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

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, data: updatedProfile }));
            }

            // --- AÇÃO: STATUS ---
            if (action === 'status') {
              const { userId, newStatus } = data || {};

              if (newStatus === 'Inativo') {
                const { data: activeAdmins } = await adminClient
                  .from('profiles')
                  .select('id')
                  .eq('role', 'ADMINISTRADOR')
                  .eq('status', 'Ativo');

                if (activeAdmins && activeAdmins.length <= 1 && activeAdmins[0].id === userId) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ success: false, error: 'Não é possível desativar o último administrador ativo da plataforma. Crie outro administrador antes de continuar.' }));
                }
              }

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

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, data: updatedProfile }));
            }

            // --- AÇÃO: REDEFINIR SENHA ---
            if (action === 'password') {
              const { userId, newPassword } = data || {};

              if (!userId || !newPassword || newPassword.length < 6) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'A senha deve conter no mínimo 6 caracteres.' }));
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

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, message: 'Senha redefinida com sucesso no Supabase Auth.' }));
            }

            // --- AÇÃO: ENVIAR REDEFINIÇÃO DE SENHA POR E-MAIL ---
            if (action === 'reset_email') {
              const { userId, email, redirectTo } = data || {};

              if (!email) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'E-mail do usuário não informado.' }));
              }

              const normalizedEmail = email.trim().toLowerCase();

              // Busca nome do usuário para auditoria
              const { data: targetProfile } = await adminClient
                .from('profiles')
                .select('*')
                .eq('email', normalizedEmail)
                .maybeSingle();

              // Dispara e-mail oficial de redefinição pelo Supabase Auth
              const { error: resetErr } = await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: redirectTo || `${SUPABASE_URL}`,
              });

              if (resetErr) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: `Falha no envio do e-mail pelo Supabase Auth: ${resetErr.message}` }));
              }

              // 3. Auditoria do Reset (NÃO registrar token, senha nem link)
              await adminClient.from('audit_logs').insert({
                id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                actor_id: actorProfile.id,
                actor_name: actorProfile.name,
                actor_email: actorProfile.email,
                action: 'PASSWORD_RESET_REQUESTED',
                target_id: userId || targetProfile?.id || null,
                target_name: targetProfile?.name || normalizedEmail,
                details: {
                  target_email: normalizedEmail,
                  method: 'supabase_auth_email_recovery',
                },
                created_at: new Date().toISOString(),
              });

              res.statusCode = 200;
              return res.end(JSON.stringify({ 
                success: true, 
                message: `E-mail oficial de redefinição de senha enviado com sucesso para ${normalizedEmail}.` 
              }));
            }

            // --- AÇÃO: REMOVER USUÁRIO ---
            if (action === 'delete') {
              const { userId } = data || {};

              if (!userId) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'ID do usuário não informado.' }));
              }

              if (userId === actorProfile.id) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Não é possível remover a própria conta durante a sessão ativa.' }));
              }

              const { data: activeAdmins } = await adminClient
                .from('profiles')
                .select('id')
                .eq('role', 'ADMINISTRADOR')
                .eq('status', 'Ativo');

              if (activeAdmins && activeAdmins.length <= 1 && activeAdmins[0].id === userId) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Não é possível remover o último administrador ativo da plataforma. Crie outro administrador antes de continuar.' }));
              }

              const { data: targetProfile } = await adminClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

              // 1. Remove do Supabase Auth
              const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(userId);
              if (delAuthErr) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ success: false, error: `Falha ao remover usuário do Supabase Auth: ${delAuthErr.message}` }));
              }

              // 2. Remove do profiles
              await adminClient.from('profiles').delete().eq('id', userId);

              // 3. Auditoria
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

              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, message: 'Usuário removido com sucesso do Supabase Auth e perfis.' }));
            }

            res.statusCode = 400;
            return res.end(JSON.stringify({ success: false, error: `Ação inválida: ${action}` }));
          } catch (err: any) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ success: false, error: err.message || 'Erro interno no servidor' }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [tailwindcss(), react(), adminApiPlugin(env)],
  };
});
