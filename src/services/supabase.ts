import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xpjlixvifoytxgplesnq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7_giSIHoHNZ6CeuVDo5sFQ_BpTvyE_D';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseHealth {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'needs_tables' | 'error';
  message: string;
  projectId: string;
  url: string;
}

/**
 * Checks connection health with the Supabase project
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const projectId = 'xpjlixvifoytxgplesnq';

  if (!isSupabaseConfigured) {
    return {
      connected: false,
      status: 'disconnected',
      message: 'Chaves do Supabase não configuradas no ambiente.',
      projectId,
      url: SUPABASE_URL,
    };
  }

  try {
    const startTime = Date.now();
    const { error } = await supabase.from('models').select('id').limit(1);
    const latency = Date.now() - startTime;

    if (error) {
      // Table doesn't exist yet (PGRST205)
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return {
          connected: true,
          status: 'needs_tables',
          message: `Conectado ao Supabase (${latency}ms)! As tabelas ainda não foram criadas no banco de dados. Execute o script schema.sql no SQL Editor do Supabase.`,
          projectId,
          url: SUPABASE_URL,
        };
      }

      return {
        connected: false,
        status: 'error',
        message: `Erro na comunicação: ${error.message}`,
        projectId,
        url: SUPABASE_URL,
      };
    }

    return {
      connected: true,
      status: 'connected',
      message: `Conexão ativa e tabelas prontas (${latency}ms)!`,
      projectId,
      url: SUPABASE_URL,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      status: 'error',
      message: err instanceof Error ? err.message : 'Falha ao conectar com o Supabase',
      projectId,
      url: SUPABASE_URL,
    };
  }
}
