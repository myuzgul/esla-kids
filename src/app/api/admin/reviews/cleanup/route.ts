import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { getFileFromDb } from '@/lib/media';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const reviews = await prisma.review.findMany({
      select: {
        id: true,
        customerName: true,
        images: true,
      },
    });

    let fixedReviewsCount = 0;
    let removedImagesCount = 0;

    for (const rev of reviews) {
      if (!rev.images) continue;

      let parsed: string[] = [];
      try {
        parsed = JSON.parse(rev.images);
      } catch (e) {
        continue;
      }

      if (!Array.isArray(parsed) || parsed.length === 0) continue;

      const validUrls: string[] = [];

      for (const url of parsed) {
        if (!url || typeof url !== 'string') continue;

        // If it's an external absolute URL (e.g. https://...), keep it
        if (url.startsWith('http://') || url.startsWith('https://')) {
          validUrls.push(url);
          continue;
        }

        const safeFilename = path.basename(url);

        // 1. Check local disk in public/uploads or public/uploads/reviews
        const localUploadsPath = path.join(process.cwd(), 'public', 'uploads', safeFilename);
        const localReviewsPath = path.join(process.cwd(), 'public', 'uploads', 'reviews', safeFilename);

        if (fs.existsSync(localUploadsPath) || fs.existsSync(localReviewsPath)) {
          validUrls.push(url);
          continue;
        }

        // 2. Check Neon PostgreSQL uploaded_files table
        const dbFile = await getFileFromDb(safeFilename);
        if (dbFile && dbFile.buffer && dbFile.buffer.length > 0) {
          validUrls.push(url);
          continue;
        }

        // Neither on disk nor in DB -> image is missing/broken!
        removedImagesCount++;
      }

      // If any broken images were detected and removed
      if (validUrls.length !== parsed.length) {
        await prisma.review.update({
          where: { id: rev.id },
          data: {
            images: JSON.stringify(validUrls),
          },
        });
        fixedReviewsCount++;
      }
    }

    return NextResponse.json({
      success: true,
      fixedReviewsCount,
      removedImagesCount,
      message: `${fixedReviewsCount} adet yorumdaki ${removedImagesCount} adet kayıp/erişilemeyen görsel temizlendi.`,
    });
  } catch (err: any) {
    console.error('Review images cleanup error:', err);
    return NextResponse.json(
      { error: 'Görseller temizlenirken hata oluştu: ' + err.message },
      { status: 500 }
    );
  }
}
