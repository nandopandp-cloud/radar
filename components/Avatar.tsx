/* eslint-disable @next/next/no-img-element */

/** Iniciais do nome, no máximo duas letras. */
export function iniciais(nome: string): string {
  return (
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

/**
 * Foto de perfil, com as iniciais como alternativa quando não há imagem.
 *
 * @param tamanho 'sm' na barra de topo, 'md' nas listas, 'lg' na tela de conta.
 */
export function Avatar({
  nome,
  avatar,
  tamanho = 'md',
}: {
  nome: string;
  avatar?: string | null;
  tamanho?: 'sm' | 'md' | 'lg';
}) {
  const classe = `avatar${tamanho === 'sm' ? ' avatar-sm' : tamanho === 'lg' ? ' avatar-lg' : ''}`;

  if (avatar) {
    return <img src={avatar} alt="" className={`${classe} avatar-imagem`} />;
  }

  return <div className={classe}>{iniciais(nome)}</div>;
}
