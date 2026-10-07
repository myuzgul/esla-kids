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
    
    // Check in public/uploads/reviews/ first, then public/uploads/
    let filePath = path.join(process.cwd(), 'public', 'uploads', 'reviews', safeFilename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);
    }

    if (!fs.existsSync(filePath)) {
      const dbFile = await getFileFromDb(safeFilename);
      if (dbFile && dbFile.buffer) {
        return new NextResponse(new Uint8Array(dbFile.buffer), {
          status: 200,
          headers: {
            'Content-Type': dbFile.mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
      return new NextResponse('File not found', { status: 404 });
    }

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
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
