import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Only recruiters can search seekers.' }, { status: 403 });
  }

  const search = new URL(request.url).searchParams.get('q')?.trim() || '';
  if (search.length < 2 || search.length > 80) {
    return NextResponse.json({ error: 'Enter 2–80 characters to search seekers.' }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    const users = await db
      .collection('user')
      .find(
        { role: 'seeker', name: { $regex: escapeRegex(search), $options: 'i' } },
        { projection: { _id: 1, id: 1, name: 1 } },
      )
      .limit(20)
      .toArray();
    const candidates = users.map((user) => ({
      id: String(user.id || user._id),
      name: typeof user.name === 'string' && user.name.trim() ? user.name.trim() : 'Seeker',
    }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Could not search seekers for recruiter messages', error);
    return NextResponse.json({ error: 'Could not search seekers.' }, { status: 500 });
  }
}
