/* eslint-disable @next/next/no-img-element */

/** Símbolo do Radar. O PNG é a arte oficial da marca. */
export function LogoRadar({ size = 38 }: { size?: number }) {
  return (
    <img
      src="/radar-simbolo.png"
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}

/** Marca completa: símbolo + palavra, para a sidebar e a tela de login. */
export function MarcaRadar({ size = 38 }: { size?: number }) {
  return (
    <div className="marca">
      <LogoRadar size={size} />
      <span className="marca-nome">Radar</span>
    </div>
  );
}
