import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await db.execute({
      sql: 'SELECT credits FROM users WHERE id = ?',
      args: [userId],
    });

    const credits = Number(result.rows[0]?.credits) || 0;

    return NextResponse.json({ credits });
  } catch (error) {
    console.error('Failed to fetch credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}


