import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    const singleFile = formData.get('file') as File | null;
    if (singleFile && files.length === 0) {
      files.push(singleFile);
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Lütfen yüklenecek en az bir fotoğraf seçiniz.' }, { status: 400 });
    }

    // Max 5 images per review upload
    if (files.length > 5) {
      return NextResponse.json({ error: 'Bir yorum için en fazla 5 fotoğraf yükleyebilirsiniz.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const reviewsDir = path.join(uploadDir, 'reviews');
    await mkdir(uploadDir, { recursive: true });
    await mkdir(reviewsDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!file || typeof file === 'string' || !file.name) continue;

      // Validate size (max 8MB)
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: 'Fotoğraf boyutu 8MB\'tan küçük olmalıdır.' }, { status: 400 });
      }

      const originalExt = path.extname(file.name).toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(originalExt) ? originalExt : '.jpg';
      const cleanFileName = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      await writeFile(path.join(uploadDir, cleanFileName), buffer);
      await writeFile(path.join(reviewsDir, cleanFileName), buffer);
      uploadedUrls.push(`/uploads/${cleanFileName}`);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      url: uploadedUrls[0] || null,
    });
  } catch (err: any) {
    console.error('Review image upload error:', err);
    return NextResponse.json({ error: 'Fotoğraf yüklenemedi: ' + err.message }, { status: 500 });
  }
}
