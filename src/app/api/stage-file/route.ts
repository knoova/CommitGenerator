import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const label = formData.get('label') as string;
  
  const ext = path.extname(file.name) || '';
  const filename = `_tmp_${label}_${Date.now()}${ext}`;
  const bundleDir = path.join(process.cwd(), '.remotion', 'bundle', 'public');
  const dest = path.join(bundleDir, filename);
  
  await fs.mkdir(bundleDir, { recursive: true });
  await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));
  
  return NextResponse.json({ 
    servedName: filename,
    cleanupUrl: `/api/cleanup-file?path=${encodeURIComponent(dest)}`
  });
}