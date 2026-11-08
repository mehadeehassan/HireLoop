import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 6));
  const db = await getDatabase();
  const collection = db.collection('recruiter_jobs');
  const query = { recruiterId: session.user.id };
  const [jobs, total] = await Promise.all([
    collection.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    collection.countDocuments(query),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return NextResponse.json({
    jobs: jobs.map((job) => ({ ...job, id: job._id.toString(), _id: undefined })),
    pagination: { page, limit, total, totalPages },
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const db = await getDatabase();
  const result = await db.collection('recruiter_jobs').insertOne({
    ...body,
    recruiterId: session.user.id,
    company: body.company || session.user.name || '',
    status: body.status || 'Active',
    applicants: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
}
