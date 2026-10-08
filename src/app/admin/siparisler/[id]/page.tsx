import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OrderDetailViewClient } from './OrderDetailViewClient';

interface Props {
  params: { id: string };
}

export default async function OrderDetailPage({ params }: Props) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          variation: true,
        },
      },
      customer: true,
    },
  });

  if (!order) notFound();

  return <OrderDetailViewClient initialOrder={order} />;
}
