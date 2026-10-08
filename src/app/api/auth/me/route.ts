import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) {
      return NextResponse.json({ customer: null });
    }

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            variation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      customer: {
        ...customer,
        orders,
      },
    });
  } catch (error: any) {
    console.error('Error fetching auth me:', error);
    return NextResponse.json({ customer: null });
  }
}
