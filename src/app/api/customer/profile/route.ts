import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer, hashPassword, comparePassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  try {
    const current = await getCurrentCustomer();
    if (!current) {
      return NextResponse.json({ error: 'Lütfen önce giriş yapınız.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, currentPassword, newPassword } = body;

    const dataToUpdate: any = {};
    if (name && name.trim()) dataToUpdate.name = name.trim();
    if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Şifrenizi değiştirmek için mevcut şifrenizi girmelisiniz.' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Yeni şifreniz en az 6 karakter olmalıdır.' }, { status: 400 });
      }

      const fullCustomer = await prisma.customer.findUnique({ where: { id: current.id } });
      if (!fullCustomer || !fullCustomer.passwordHash) {
        return NextResponse.json({ error: 'Müşteri kaydı bulunamadı.' }, { status: 404 });
      }

      const isMatch = await comparePassword(currentPassword, fullCustomer.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Mevcut şifreniz hatalı.' }, { status: 400 });
      }

      dataToUpdate.passwordHash = await hashPassword(newPassword);
    }

    const updated = await prisma.customer.update({
      where: { id: current.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message || 'Profil güncellenemedi.' }, { status: 500 });
  }
}
