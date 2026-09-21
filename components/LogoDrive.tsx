/**
 * Símbolo do Google Drive — o triângulo de três cores, desenhado em SVG.
 *
 * Fica inline em vez de virar arquivo em public/ porque aparece em tamanhos
 * bem diferentes (17px num botão, 26px no cartão da conta) e o traço vetorial
 * não perde nitidez. Marca do Google, usada só para identificar a origem dos
 * arquivos.
 */
export function LogoDrive({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M16.3 4h15.4l15.4 26.7H31.7z" fill="#ffc107" />
      <path d="M31.7 30.7h15.4L39.4 44H8.6z" fill="#1976d2" />
      <path d="M16.3 4L1 30.7 8.6 44l15.4-26.7z" fill="#4caf50" />
    </svg>
  );
}
