import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDatabase();
  const profile = await db
    .collection('recruiter_profiles')
    .findOne({ recruiterId: session.user.id });

  return NextResponse.json({
    recruiterName: profile?.recruiterName || session.user.name || '',
    companyName: profile?.companyName || '',
    email: profile?.email || session.user.email || '',
    phone: profile?.phone || '',
    emailNotifications: profile?.emailNotifications ?? true,
    applicationNotifications: profile?.applicationNotifications ?? true,
    image: session.user.image || '',
  });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const db = await getDatabase();
  const profileData = {
    recruiterName: String(body.recruiterName || '').trim(),
    companyName: String(body.companyName || '').trim(),
    email: String(body.email || session.user.email || '').trim(),
    phone: String(body.phone || '').trim(),
    emailNotifications: Boolean(body.emailNotifications),
    applicationNotifications: Boolean(body.applicationNotifications),
  };

  await db.collection('recruiter_profiles').updateOne(
    { recruiterId: session.user.id },
    {
      $set: { ...profileData, updatedAt: new Date() },
      $setOnInsert: { recruiterId: session.user.id, createdAt: new Date() },
    },
    { upsert: true },
  );

  await db.collection('user').updateOne(
    {
      $or: [
        ...(ObjectId.isValid(session.user.id) ? [{ _id: new ObjectId(session.user.id) }] : []),
        { id: session.user.id },
      ],
    },
    {
      $set: {
        name: profileData.recruiterName || session.user.name,
        email: profileData.email,
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ success: true, profile: profileData });
}
