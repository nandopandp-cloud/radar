import { LADO_MAXIMO, TAMANHO_MAXIMO, TIPOS_AVATAR } from '@/lib/avatar';

/** Limite do arquivo escolhido, antes de qualquer processamento. */
const ARQUIVO_MAXIMO = 8 * 1024 * 1024;

function lerComoDataURI(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * Lê o arquivo escolhido para o editor de enquadramento, sem recortar nada.
 *
 * O recorte automático pelo centro corta mal a maioria das fotos, então o
 * enquadramento passou a ser escolhido à mão em `EditorFoto`. Aqui só
 * validamos tipo e tamanho.
 *
 * GIFs não passam pelo editor: redesenhá-los no canvas manteria só o
 * primeiro quadro. Por isso o retorno diz se a imagem é editável.
 */
export async function lerParaEditor(
  arquivo: File,
): Promise<{ dataUri: string; editavel: boolean }> {
  const tipo = arquivo.type.toLowerCase();

  if (!(TIPOS_AVATAR as readonly string[]).includes(tipo)) {
    throw new Error('Use uma imagem JPG, PNG ou GIF.');
  }
  if (arquivo.size > ARQUIVO_MAXIMO) {
    throw new Error('Arquivo muito grande. Escolha uma imagem de até 8 MB.');
  }

  const dataUri = await lerComoDataURI(arquivo);

  if (tipo === 'image/gif') {
    if (dataUri.length > TAMANHO_MAXIMO) {
      throw new Error('Este GIF é muito pesado. Escolha um menor.');
    }
    return { dataUri, editavel: false };
  }

  return { dataUri, editavel: true };
}

/**
 * Prepara a foto de perfil no navegador: valida o tipo, reduz para um
 * quadrado de LADO_MAXIMO e devolve um data URI pronto para o banco.
 *
 * GIFs passam direto, sem canvas — redesenhá-los manteria só o primeiro
 * quadro e mataria a animação.
 */
export async function prepararAvatar(arquivo: File): Promise<string> {
  const tipo = arquivo.type.toLowerCase();

  if (!(TIPOS_AVATAR as readonly string[]).includes(tipo)) {
    throw new Error('Use uma imagem JPG, PNG ou GIF.');
  }
  if (arquivo.size > ARQUIVO_MAXIMO) {
    throw new Error('Arquivo muito grande. Escolha uma imagem de até 8 MB.');
  }

  const original = await lerComoDataURI(arquivo);

  if (tipo === 'image/gif') {
    if (original.length > TAMANHO_MAXIMO) {
      throw new Error('Este GIF é muito pesado. Escolha um menor.');
    }
    return original;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    el.src = original;
  });

  // Recorta o centro da imagem para um quadrado, evitando distorção.
  const lado = Math.min(img.width, img.height);
  const origemX = (img.width - lado) / 2;
  const origemY = (img.height - lado) / 2;
  const destino = Math.min(lado, LADO_MAXIMO);

  const canvas = document.createElement('canvas');
  canvas.width = destino;
  canvas.height = destino;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');

  ctx.drawImage(img, origemX, origemY, lado, lado, 0, 0, destino, destino);

  // JPEG com qualidade 0.85 mantém a foto boa em ~30 KB; PNG só faria sentido
  // para transparência, que um avatar circular não aproveita.
  const reduzido = canvas.toDataURL('image/jpeg', 0.85);

  if (reduzido.length > TAMANHO_MAXIMO) {
    throw new Error('Não foi possível reduzir a imagem o suficiente.');
  }

  return reduzido;
}
