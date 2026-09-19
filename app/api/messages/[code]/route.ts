import { NextResponse } from 'next/server';
import { getMessage, incrementViews, deleteMessage } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Await params if Next 15 requires it, which is standard in Next.js 15
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing code' }, { status: 400 });
    }

    const msg = getMessage(code);
    if (!msg) {
      return NextResponse.json({ error: 'Message not found, expired, or already burned' }, { status: 404 });
    }

    // Capture response data before incrementing views (which might burn/delete it)
    const responseData = {
      code: msg.code,
      content: msg.content,
      durationHours: msg.durationHours,
      createdAt: msg.createdAt,
      expiresAt: msg.expiresAt,
      attachments: msg.attachments,
      burnAfterRead: msg.burnAfterRead,
      viewsCount: msg.viewsCount,
    };

    // Increment views (and delete if burn-after-read is active)
    incrementViews(code);

    return NextResponse.json(responseData);
  } catch (err) {
    console.error('API GET [code] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing code' }, { status: 400 });
    }

    const deleted = deleteMessage(code);
    if (!deleted) {
      return NextResponse.json({ error: 'Message not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Message manually destroyed successfully' });
  } catch (err) {
    console.error('API DELETE [code] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
