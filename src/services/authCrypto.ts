/**
 * Módulo Criptográfico de Segurança UZE DOCTOR
 * Utiliza Web Crypto API padrão com PBKDF2-HMAC-SHA256 e 100.000 iterações.
 * As senhas NUNCA são salvas em texto puro.
 */

export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(
  passwordAttempt: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const computedHash = await hashPassword(passwordAttempt, salt);
    // Comparação de tamanho constante para mitigar timing attacks
    if (computedHash.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < computedHash.length; i++) {
      diff |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    console.error('[Security] Falha ao verificar hash:', err);
    return false;
  }
}

export function validatePasswordRequirements(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      message: 'A senha deve conter no mínimo 6 caracteres.',
    };
  }
  return { isValid: true };
}
