import { redirect, notFound } from 'next/navigation';
import { ViewAsBanner } from '@/components/layout/ViewAsBanner';
import { getViewer, getViewerCustomer } from '@/lib/auth/view-as';
import { getOrderWithDetailsByIdAndCustomerId } from '@/lib/database/orders';
import { OrderDetailsView } from '@/components/orders/OrderDetailsView';

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { orderId } = await params;

  const viewer = await getViewer();

  if (!viewer) {
    redirect('/auth/login');
  }

  const customer = await getViewerCustomer(viewer);
  if (!customer) {
    redirect('/auth/signup');
  }

  const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
  if (!order) {
    notFound();
  }

  return (
    <>
      <OrderDetailsView order={order} />
      <ViewAsBanner />
    </>
  );
}
