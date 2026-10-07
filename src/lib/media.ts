import { prisma } from './prisma';

export interface StoredFile {
  filename: string;
  data: string; // base64
  mimeType: string;
  size: number;
}

/**
 * Save a file buffer to Neon PostgreSQL permanently.
 */
export async function saveFileToDb(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
  const base64Data = buffer.toString('base64');
  const size = buffer.length;
  const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO uploaded_files (id, filename, data, mime_type, size, created_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (filename) DO UPDATE 
     SET data = EXCLUDED.data, mime_type = EXCLUDED.mime_type, size = EXCLUDED.size`,
    id,
    filename,
    base64Data,
    mimeType,
    size
  );

  return `/uploads/${filename}`;
}

/**
 * Retrieve a file from Neon PostgreSQL by filename.
 */
export async function getFileFromDb(filename: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT data, mime_type FROM uploaded_files WHERE filename = $1 LIMIT 1`,
      filename
    );

    if (rows && rows.length > 0 && rows[0].data) {
      const buffer = Buffer.from(rows[0].data, 'base64');
      const mimeType = rows[0].mime_type || 'image/jpeg';
      return { buffer, mimeType };
    }
  } catch (err) {
    console.warn(`[Media DB] Could not fetch ${filename} from database:`, err);
  }
  return null;
}
