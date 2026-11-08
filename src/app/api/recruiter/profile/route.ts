import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDatabase();
  const profile = await db.collection('recruiter_profiles').findOne({ recruiterId: session.user.id });

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
  await db.collection('recruiter_profiles').updateOne(
    { recruiterId: session.user.id },
    {
      $set: {
        recruiterName: body.recruiterName || '',
        companyName: body.companyName || '',
        email: body.email || session.user.email || '',
        phone: body.phone || '',
        emailNotifications: Boolean(body.emailNotifications),
        applicationNotifications: Boolean(body.applicationNotifications),
        updatedAt: new Date(),
      },
      $setOnInsert: { recruiterId: session.user.id, createdAt: new Date() },
    },
    { upsert: true },
  );

  return NextResponse.json({ success: true });
}
