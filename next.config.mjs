/** @type {import('next').NextConfig} */
const nextConfig = {
  // O diretório do projeto é a raiz; evita o aviso de inferência de workspace.
  outputFileTracingRoot: import.meta.dirname,
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;
