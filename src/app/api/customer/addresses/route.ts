import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const current = await getCurrentCustomer();
    if (!current) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { customerId: current.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses });
  } catch (error: any) {
    return NextResponse.json({ error: 'Adresler alınamadı' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const current = await getCurrentCustomer();
    if (!current) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { title, fullName, phone, city, district, addressDetail, postalCode, isDefault } = body;

    if (!fullName || !phone || !city || !district || !addressDetail) {
      return NextResponse.json({ error: 'Lütfen zorunlu alanları doldurunuz.' }, { status: 400 });
    }

    // If new address is default, reset other addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: current.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        customerId: current.id,
        title: title || 'Ev',
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        district: district.trim(),
        addressDetail: addressDetail.trim(),
        postalCode: postalCode ? postalCode.trim() : null,
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({ success: true, address });
  } catch (error: any) {
    console.error('Create address error:', error);
    return NextResponse.json({ error: error.message || 'Adres eklenemedi.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const current = await getCurrentCustomer();
    if (!current) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, fullName, phone, city, district, addressDetail, postalCode, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: 'Adres ID belirtilmedi.' }, { status: 400 });
    }

    const existing = await prisma.address.findFirst({
      where: { id, customerId: current.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Adres bulunamadı.' }, { status: 404 });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: current.id, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        title: title || existing.title,
        fullName: fullName ? fullName.trim() : existing.fullName,
        phone: phone ? phone.trim() : existing.phone,
        city: city ? city.trim() : existing.city,
        district: district ? district.trim() : existing.district,
        addressDetail: addressDetail ? addressDetail.trim() : existing.addressDetail,
        postalCode: postalCode !== undefined ? postalCode : existing.postalCode,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
      },
    });

    return NextResponse.json({ success: true, address: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Adres güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const current = await getCurrentCustomer();
    if (!current) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Adres ID belirtilmedi.' }, { status: 400 });
    }

    await prisma.address.deleteMany({
      where: { id, customerId: current.id },
    });

    return NextResponse.json({ success: true, message: 'Adres silindi.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Adres silinemedi.' }, { status: 500 });
  }
}
