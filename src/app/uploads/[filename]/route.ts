import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getFileFromDb } from '@/lib/media';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

    // 1. First check local disk
    if (fs.existsSync(filePath)) {
      const ext = path.extname(safeFilename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const fileBuffer = fs.readFileSync(filePath);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. If not on local disk, fetch directly from Neon PostgreSQL!
    const dbFile = await getFileFromDb(safeFilename);
    if (dbFile && dbFile.buffer) {
      // Also write back to local disk as a cache so next request is instant
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(filePath, dbFile.buffer);
      } catch (e) {}

      return new NextResponse(new Uint8Array(dbFile.buffer), {
        status: 200,
        headers: {
          'Content-Type': dbFile.mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse('File not found', { status: 404 });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
