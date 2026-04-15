/**
 * URL base da API do backend.
 * Em produção (Vercel), usa a variável NEXT_PUBLIC_API_URL.
 * Em desenvolvimento local, usa o hostname da rede + porta 3001.
 */
export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}
