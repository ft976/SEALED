import { NextResponse } from 'next/server';
import { saveMessage } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, durationHours, attachments = [], burnAfterRead = false } = body;

    // Validation
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }

    if (!content.trim() && attachments.length === 0) {
      return NextResponse.json({ error: 'Message content or attachments are required' }, { status: 400 });
    }

    const hours = Number(durationHours);
    if (isNaN(hours) || hours <= 0 || hours > 5) {
      return NextResponse.json({ error: 'Duration hours must be a number between 1 and 5' }, { status: 400 });
    }

    // Attachment validation (limit total size to ~5.5MB for 5MB uploads)
    let totalSize = 0;
    for (const file of attachments) {
      if (!file.name || !file.type || !file.data) {
        return NextResponse.json({ error: 'Invalid attachment structure' }, { status: 400 });
      }
      totalSize += file.size || 0;
    }

    if (totalSize > 5.5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Total attachment size exceeds the 5.5MB safety limit' }, { status: 400 });
    }

    const saved = saveMessage({
      content,
      durationHours: hours,
      attachments,
      burnAfterRead: !!burnAfterRead,
    });

    return NextResponse.json({
      success: true,
      code: saved.code,
      expiresAt: saved.expiresAt,
      burnAfterRead: saved.burnAfterRead,
    });

  } catch (err: any) {
    console.error('API POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
