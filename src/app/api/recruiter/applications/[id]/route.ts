import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid application id' }, { status: 400 });

  const { status } = await request.json();
  if (!['New', 'Reviewed', 'Shortlisted', 'Rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = await getDatabase();
  const result = await db.collection('applications').updateOne(
    { _id: new ObjectId(id), recruiterId: session.user.id },
    { $set: { status, updatedAt: new Date() } },
  );

  if (!result.matchedCount) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
