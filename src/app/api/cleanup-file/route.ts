import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  
  if (!filePath) {
    return NextResponse.json(
      { error: 'Missing path parameter' },
      { status: 400 }
    );
  }
  
  try {
    await fs.unlink(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'File cleanup failed', details: String(error) },
      { status: 500 }
    );
  }
}