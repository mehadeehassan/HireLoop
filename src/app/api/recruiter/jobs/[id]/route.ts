import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

async function authenticatedJob(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!ObjectId.isValid(id)) return { session, response: NextResponse.json({ error: 'Invalid job' }, { status: 400 }) };
  return { session, response: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, response } = await authenticatedJob(id);
  if (response) return response;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const db = await getDatabase();
  const result = await db.collection('recruiter_jobs').updateOne(
    { _id: new ObjectId(id), recruiterId: session.user.id },
    { $set: { ...body, updatedAt: new Date() } },
  );
  if (!result.matchedCount) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, response } = await authenticatedJob(id);
  if (response) return response;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDatabase();
  const result = await db.collection('recruiter_jobs').deleteOne({ _id: new ObjectId(id), recruiterId: session.user.id });
  if (!result.deletedCount) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
