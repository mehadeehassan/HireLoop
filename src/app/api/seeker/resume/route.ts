import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can access this resume.' }, { status: 403 });
  }

  const profile = await (await getDatabase())
    .collection('seeker_profiles')
    .findOne({ candidateId: session.user.id }, { projection: { resumeFile: 1 } });
  const resume = profile?.resumeFile;
  if (
    typeof resume?.data !== 'string' ||
    resume.type !== 'application/pdf' ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(resume.data)
  ) {
    return NextResponse.json({ error: 'No uploaded resume was found.' }, { status: 404 });
  }

  const fileName = String(resume.name || 'resume.pdf').replace(/["\\\r\n]/g, '_');
  return new Response(Buffer.from(resume.data, 'base64'), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can remove this resume.' }, { status: 403 });
  }

  await (await getDatabase()).collection('seeker_profiles').updateOne(
    { candidateId: session.user.id },
    { $set: { resumeFile: null, resumeUrl: '', updatedAt: new Date() } },
  );
  return NextResponse.json({ success: true });
}
