import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Lütfen adınızı ve soyadınızı giriniz.' }, { status: 400 });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi giriniz.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Şifreniz en az 6 karakter olmalıdır.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing customer
    const existing = await prisma.customer.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten bulunmaktadır.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        passwordHash,
        role: 'CUSTOMER',
        emailVerified: false,
      },
    });

    // Create session token
    const token = createSessionToken({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      role: customer.role,
    });

    const response = NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
      },
    });

    // Set HTTP-Only Cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: error.message || 'Kayıt sırasında bir hata oluştu.' }, { status: 500 });
  }
}
