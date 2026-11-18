import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Le dossier du projet est la racine (évite l'avertissement « multiple lockfiles »)
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
  serverExternalPackages: ['sharp', 'pdfkit', 'archiver'],
};
export default nextConfig;
