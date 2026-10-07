import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { saveFileToDb } from '@/lib/media';

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
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {}

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

      // 1. Write to local disk cache
      try {
        await writeFile(filePath, buffer);
      } catch (e) {
        console.warn('Could not write to local disk (ephemeral):', e);
      }

      // 2. Persist permanently to Neon PostgreSQL
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
      };
      const mimeType = mimeTypes[safeExt] || file.type || 'image/jpeg';
      await saveFileToDb(cleanFileName, buffer, mimeType);

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
