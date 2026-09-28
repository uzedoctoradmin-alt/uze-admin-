import { supabase } from './supabase';

const BUCKET_NAME = 'product-images';

/**
 * Redimensiona e otimiza a imagem no navegador antes de enviar para o Storage
 * Evita carregar arquivos desnecessariamente pesados e economiza banda/armazenamento.
 */
export async function compressAndOptimizeImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Se não for imagem padrão, retorna o próprio arquivo
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;

        // Calcular proporção preservando o aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file);
          return;
        }

        // Desenhar no canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como WebP se suportado, senão JPEG
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          outputMime,
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Upload de imagem de produto para o Supabase Storage
 */
export async function uploadProductImage(
  file: File,
  oldPathOrUrl?: string
): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
  try {
    // 1. Validar tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      return {
        success: false,
        error: 'Formato inválido. Use JPG, JPEG, PNG ou WEBP.',
      };
    }

    // 2. Validar tamanho máximo (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: 'A imagem deve ter no máximo 5MB.',
      };
    }

    // 3. Comprimir
    const optimizedBlob = await compressAndOptimizeImage(file);

    // 4. Gerar nome de arquivo único
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const cleanFileName = `products/prod-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;

    // 5. Enviar para o bucket product-images
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(cleanFileName, optimizedBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/webp',
      });

    if (uploadError) {
      console.error('[StorageService] Erro ao enviar imagem:', uploadError);
      return {
        success: false,
        error: `Falha no upload: ${uploadError.message}`,
      };
    }

    // 6. Obter URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(cleanFileName);

    // 7. Limpar imagem antiga se existir
    if (oldPathOrUrl) {
      await deleteProductImage(oldPathOrUrl);
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: cleanFileName,
    };
  } catch (err: any) {
    console.error('[StorageService] Exceção no upload:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao processar imagem.',
    };
  }
}

/**
 * Remove imagem de produto do Supabase Storage
 */
export async function deleteProductImage(pathOrUrl: string): Promise<boolean> {
  if (!pathOrUrl) return true;

  try {
    let filePath = pathOrUrl;

    // Se for URL completa, extrai apenas o path relativo dentro do bucket
    if (pathOrUrl.includes(BUCKET_NAME)) {
      const parts = pathOrUrl.split(`${BUCKET_NAME}/`);
      if (parts.length > 1) {
        filePath = parts[1].split('?')[0]; // remove query params
      }
    }

    if (filePath.startsWith('products/')) {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      if (error) {
        console.warn('[StorageService] Aviso ao remover imagem antiga:', error.message);
        return false;
      }
      return true;
    }

    return true;
  } catch (err) {
    console.warn('[StorageService] Falha ao excluir imagem antiga:', err);
    return false;
  }
}
