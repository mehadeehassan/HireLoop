import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can access this profile.' }, { status: 403 });
  }

  const profile = await (await getDatabase())
    .collection('seeker_profiles')
    .findOne({ candidateId: session.user.id });

  return NextResponse.json({
    name: profile?.name || session.user.name || '',
    email: session.user.email,
    phone: profile?.phone || '',
    location: profile?.location || '',
    experience: profile?.experience || '',
    skills: Array.isArray(profile?.skills) ? profile.skills.join(', ') : '',
    linkedinUrl: profile?.linkedinUrl || '',
    resumeUrl: profile?.resumeUrl || '',
    portfolioUrl: profile?.portfolioUrl || '',
    coverLetter: profile?.coverLetter || '',
    image: session.user.image || '',
  });
}
