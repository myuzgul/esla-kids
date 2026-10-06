import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const safeFilename = path.basename(filename);
    let filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

    if (!fs.existsSync(filePath)) {
      // Check if file is inside a subfolder under public/uploads
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      let foundPath: string | null = null;
      if (fs.existsSync(uploadsDir)) {
        const findRecursive = (dir: string) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              findRecursive(full);
              if (foundPath) return;
            } else if (entry.name.toLowerCase() === safeFilename.toLowerCase()) {
              foundPath = full;
              return;
            }
          }
        };
        try { findRecursive(uploadsDir); } catch(e) {}
      }

      if (foundPath) {
        filePath = foundPath;
      } else {
        return new NextResponse('File not found', { status: 404 });
      }
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
