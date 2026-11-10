import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json(
      { error: 'Only job seekers can view their applications.' },
      { status: 403 },
    );
  }

  const applications = await (await getDatabase())
    .collection('applications')
    .find({ candidateId: session.user.id, isDummy: { $ne: true } })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    applications: applications.map((application) => ({
      ...application,
      id: application._id.toString(),
      _id: undefined,
      date: application.createdAt
        ? new Date(application.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
        : '',
    })),
  });
}
