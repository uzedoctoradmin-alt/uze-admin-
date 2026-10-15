import { supabase } from './supabase';
import type { ColorItem } from '../types';

const STORAGE_COLORS_KEY = 'uze_saved_colors_palette_v1';

export const DEFAULT_PRESET_COLORS: ColorItem[] = [
  { id: 'col-branco', name: 'Branco', hexCode: '#FFFFFF', isFavorite: true, isActive: true },
  { id: 'col-preto', name: 'Preto', hexCode: '#111827', isFavorite: true, isActive: true },
  { id: 'col-azul-marinho', name: 'Azul-marinho', hexCode: '#0F284C', isFavorite: true, isActive: true },
  { id: 'col-vinho', name: 'Vinho / Bordô', hexCode: '#831843', isFavorite: true, isActive: true },
  { id: 'col-verde-cirurgico', name: 'Verde Cirúrgico', hexCode: '#0D9488', isFavorite: true, isActive: true },
  { id: 'col-azul-claro', name: 'Azul Claro', hexCode: '#38BDF8', isFavorite: false, isActive: true },
  { id: 'col-cinza-chumbo', name: 'Cinza Chumbo', hexCode: '#4B5563', isFavorite: false, isActive: true },
  { id: 'col-rosa-quartzo', name: 'Rosa Quartzo', hexCode: '#F472B6', isFavorite: false, isActive: true },
  { id: 'col-lavanda', name: 'Lavanda', hexCode: '#B009B3', isFavorite: false, isActive: true },
  { id: 'col-verde-agua', name: 'Verde Água', hexCode: '#0BD085', isFavorite: false, isActive: true },
  { id: 'col-verde-menta', name: 'Verde Menta', hexCode: '#058F5A', isFavorite: false, isActive: true },
  { id: 'col-marrom', name: 'Marrom', hexCode: '#734D17', isFavorite: false, isActive: true },
  { id: 'col-coral', name: 'Coral', hexCode: '#F08080', isFavorite: false, isActive: true },
];

/**
 * Normaliza o nome da cor para evitar duplicatas como 'branco', 'Branco', 'BRANCO'.
 */
export function normalizeColorName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed
    .split(' ')
    .map(word => {
      if (['de', 'da', 'do', 'das', 'dos', 'e', '/'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export const colorService = {
  /**
   * Busca todas as cores salvas, priorizando favoritas primeiro.
   */
  async fetchColors(): Promise<ColorItem[]> {
    try {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .eq('is_active', true)
        .order('is_favorite', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        // Fallback para cache local e lista padrão se tabela colors ainda não existir no Supabase
        const local = localStorage.getItem(STORAGE_COLORS_KEY);
        if (local) {
          try {
            return JSON.parse(local);
          } catch {
            return DEFAULT_PRESET_COLORS;
          }
        }
        return DEFAULT_PRESET_COLORS;
      }

      if (data && data.length > 0) {
        const mapped: ColorItem[] = data.map((r: any) => ({
          id: r.id,
          name: r.name,
          hexCode: r.hex_code || '#173E75',
          isFavorite: Boolean(r.is_favorite),
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));

        try {
          localStorage.setItem(STORAGE_COLORS_KEY, JSON.stringify(mapped));
        } catch {}
        return mapped;
      }

      // Se a tabela estiver vazia, retorna os presets
      return DEFAULT_PRESET_COLORS;
    } catch {
      const local = localStorage.getItem(STORAGE_COLORS_KEY);
      if (local) {
        try {
          return JSON.parse(local);
        } catch {}
      }
      return DEFAULT_PRESET_COLORS;
    }
  },

  /**
   * Cadastra uma nova cor com deduplicação por nome e alerta de HEX repetido.
   */
  async createColor(params: {
    name: string;
    hexCode: string;
    isFavorite?: boolean;
    existingColors?: ColorItem[];
  }): Promise<{ success: boolean; color?: ColorItem; error?: string; warning?: string }> {
    const rawName = params.name.trim();
    if (!rawName) {
      return { success: false, error: 'O nome da cor é obrigatório.' };
    }

    const normalizedName = normalizeColorName(rawName);
    const hex = params.hexCode.trim().toUpperCase();

    if (!/^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(hex)) {
      return { success: false, error: 'Código HEX inválido. Utilize formato #FFFFFF ou #FFF.' };
    }

    // 1. Verificar duplicidade de nome
    const currentList = params.existingColors || (await this.fetchColors());
    const nameExists = currentList.some(
      c => c.name.toLowerCase().trim() === normalizedName.toLowerCase().trim()
    );

    if (nameExists) {
      return {
        success: false,
        error: `A cor "${normalizedName}" já está cadastrada na biblioteca. Selecione-a na lista de Cores Salvas.`,
      };
    }

    // 2. Verificar duplicidade de HEX (alerta não impeditivo)
    const sameHex = currentList.find(c => c.hexCode.toUpperCase() === hex);
    let warning: string | undefined;
    if (sameHex) {
      warning = `Atenção: A cor "${sameHex.name}" já utiliza o código hexadecimal ${hex}.`;
    }

    const id = `col-${Date.now()}`;
    const newColor: ColorItem = {
      id,
      name: normalizedName,
      hexCode: hex,
      isFavorite: Boolean(params.isFavorite),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('colors').insert({
        id,
        name: normalizedName,
        hex_code: hex,
        is_favorite: Boolean(params.isFavorite),
        is_active: true,
      });

      if (error) {
        console.warn('[Supabase] Falha ao gravar cor na tabela colors (usando fallback local):', error.message);
      }

      // Atualizar cache local
      const updatedList = [newColor, ...currentList.filter(c => c.id !== id)];
      try {
        localStorage.setItem(STORAGE_COLORS_KEY, JSON.stringify(updatedList));
      } catch {}

      return { success: true, color: newColor, warning };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao registrar cor.' };
    }
  },

  /**
   * Alterna status de favorita de uma cor.
   */
  async toggleFavorite(colorId: string, isFavorite: boolean): Promise<boolean> {
    try {
      await supabase
        .from('colors')
        .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
        .eq('id', colorId);

      const local = localStorage.getItem(STORAGE_COLORS_KEY);
      if (local) {
        const list: ColorItem[] = JSON.parse(local);
        const updated = list.map(c => (c.id === colorId ? { ...c, isFavorite } : c));
        localStorage.setItem(STORAGE_COLORS_KEY, JSON.stringify(updated));
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Remove uma cor da biblioteca.
   */
  async deleteColor(colorId: string): Promise<boolean> {
    try {
      await supabase.from('colors').update({ is_active: false }).eq('id', colorId);

      const local = localStorage.getItem(STORAGE_COLORS_KEY);
      if (local) {
        const list: ColorItem[] = JSON.parse(local);
        const updated = list.filter(c => c.id !== colorId);
        localStorage.setItem(STORAGE_COLORS_KEY, JSON.stringify(updated));
      }
      return true;
    } catch {
      return false;
    }
  },
};
