import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    // Also support single 'file' field
    const singleFile = formData.get('file') as File | null;
    if (singleFile && files.length === 0) {
      files.push(singleFile);
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Lütfen yüklenecek en az bir görsel dosyası seçiniz.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!file || typeof file === 'string' || !file.name) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Clean extension
      const originalExt = path.extname(file.name).toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(originalExt) ? originalExt : '.jpg';
      const cleanFileName = `esla-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
      const filePath = path.join(uploadDir, cleanFileName);

      await writeFile(filePath, buffer);
      uploadedUrls.push(`/uploads/${cleanFileName}`);
    }

    return NextResponse.json({ 
      success: true, 
      urls: uploadedUrls,
      url: uploadedUrls[0] || null
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Görsel yüklenirken bir hata oluştu: ' + err.message }, { status: 500 });
  }
}
