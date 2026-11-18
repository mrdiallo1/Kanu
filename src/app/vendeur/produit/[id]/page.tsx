import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import * as db from '@/lib/db';
import { currentVendor } from '@/lib/shop';
import { Icon } from '@/components/Icon';
import { ProductForm } from '@/components/shop/ProductForm';

export const metadata = { title: 'Produit' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, vendor } = await currentVendor();
  if (!user) redirect('/connexion?suite=/vendeur');
  if (!vendor) redirect('/vendeur');
  const product = id === 'nouveau' ? null : await db.products.byId(id);
  if (id !== 'nouveau' && (!product || product.vendorId !== vendor.id)) notFound();
  return (
    <>
      <header className="appbar" style={{ paddingLeft: 4 }}>
        <Link href="/vendeur?v=produits" className="icon-btn" aria-label="Retour">
          <Icon name="back" />
        </Link>
        <h1>{product ? 'Modifier le produit' : 'Nouveau produit'}</h1>
      </header>
      <main className="narrow" style={{ padding: '16px 0 64px' }}>
        <ProductForm product={product} />
      </main>
    </>
  );
}
