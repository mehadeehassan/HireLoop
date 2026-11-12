import { auth } from '@/lib/auth';
import { fetchBackendUsage } from '@/lib/job-api';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

const maxResumeSize = 5 * 1024 * 1024;
const maxAvatarSize = 5 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeBase64(value: string) {
  if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  return Buffer.from(value, 'base64');
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can access this profile.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_APPLICATIONS_API_SECRET;
  if (!apiSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Subscription service is not configured.' }, { status: 503 });
  }

  try {
    const { response, data } = await fetchBackendUsage('seeker', session.user.id, apiSecret);
    if (!response.ok || !isRecord(data) || typeof data.plan !== 'string') {
      console.error('Seeker subscription summary request failed', response.status);
      return NextResponse.json(
        { error: 'Could not load seeker subscription information.' },
        { status: 502 },
      );
    }

    const profile = await (await getDatabase())
      .collection('seeker_profiles')
      .findOne({ candidateId: session.user.id });

    return NextResponse.json({
      name: profile?.name || session.user.name || '',
      email: session.user.email,
      plan: data.plan,
      headline: profile?.headline || '',
      bio: profile?.bio || '',
      hasResume: Boolean(profile?.resumeFile?.data || profile?.resumeUrl),
      resumeFileName: profile?.resumeFile?.name || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      experience: profile?.experience || '',
      skills: Array.isArray(profile?.skills) ? profile.skills.join(', ') : '',
      linkedinUrl: profile?.linkedinUrl || '',
      resumeUrl: profile?.resumeUrl || '',
      portfolioUrl: profile?.portfolioUrl || '',
      coverLetter: profile?.coverLetter || '',
      image: profile?.image || session.user.image || '',
    });
  } catch (error) {
    console.error('Could not load seeker profile and subscription', error);
    return NextResponse.json({ error: 'Could not load seeker profile.' }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can update this profile.' }, { status: 403 });
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: 'Profile details must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(value)) {
    return NextResponse.json({ error: 'Please provide valid profile details.' }, { status: 400 });
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const phone = typeof value.phone === 'string' ? value.phone.trim() : '';
  const location = typeof value.location === 'string' ? value.location.trim() : '';
  const experience = typeof value.experience === 'string' ? value.experience.trim() : '';
  const headline = typeof value.headline === 'string' ? value.headline.trim().slice(0, 160) : '';
  const bio = typeof value.bio === 'string' ? value.bio.trim().slice(0, 2000) : '';
  const linkedinUrl = typeof value.linkedinUrl === 'string' ? value.linkedinUrl.trim() : '';
  const portfolioUrl = typeof value.portfolioUrl === 'string' ? value.portfolioUrl.trim() : '';
  const skills = typeof value.skills === 'string'
    ? value.skills.split(',').map((skill) => skill.trim()).filter(Boolean).slice(0, 30)
    : [];
  const image = typeof value.image === 'string' ? value.image : '';
  const resumeFile = value.resumeFile;

  if (!name || name.length > 120 || phone.length > 40 || location.length > 160 || experience.length > 160) {
    return NextResponse.json({ error: 'Please enter a valid name and profile details.' }, { status: 400 });
  }
  if (linkedinUrl && !isSafeUrl(linkedinUrl, ['linkedin.com'])) {
    return NextResponse.json({ error: 'Enter a valid LinkedIn URL.' }, { status: 400 });
  }
  if (portfolioUrl && !isSafeUrl(portfolioUrl)) {
    return NextResponse.json({ error: 'Portfolio must be a valid HTTP or HTTPS URL.' }, { status: 400 });
  }

  let imageValue: string | undefined;
  if (image) {
    const match = /^data:(image\/(?:png|jpeg|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
    if (!match) {
      return NextResponse.json({ error: 'Avatar must be a JPG, PNG, or GIF image.' }, { status: 400 });
    }
    const imageBytes = decodeBase64(match[2]);
    if (!imageBytes || imageBytes.length > maxAvatarSize) {
      return NextResponse.json({ error: 'Avatar image must be 5 MB or smaller.' }, { status: 400 });
    }
    imageValue = image;
  }

  let resumeValue: { name: string; type: 'application/pdf'; data: string } | undefined;
  if (resumeFile !== undefined && resumeFile !== null) {
    if (
      !isRecord(resumeFile) ||
      typeof resumeFile.name !== 'string' ||
      typeof resumeFile.type !== 'string' ||
      typeof resumeFile.data !== 'string'
    ) {
      return NextResponse.json({ error: 'Please upload a valid PDF resume.' }, { status: 400 });
    }
    const bytes = decodeBase64(resumeFile.data);
    const fileName = resumeFile.name.trim().replace(/[\\/]/g, '_').slice(0, 180);
    if (
      !fileName.toLowerCase().endsWith('.pdf') ||
      resumeFile.type !== 'application/pdf' ||
      !bytes ||
      bytes.length > maxResumeSize ||
      bytes.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      return NextResponse.json({ error: 'Resume must be a PDF file no larger than 5 MB.' }, { status: 400 });
    }
    resumeValue = { name: fileName, type: 'application/pdf', data: resumeFile.data };
  }

  const updatedAt = new Date();
  const profileUpdate: Record<string, unknown> = {
    name,
    phone,
    location,
    experience,
    headline,
    bio,
    skills,
    linkedinUrl,
    portfolioUrl,
    candidateId: session.user.id,
    updatedAt,
  };
  if (imageValue !== undefined) profileUpdate.image = imageValue;
  if (resumeValue) profileUpdate.resumeFile = resumeValue;
  if (value.removeResume === true) {
    profileUpdate.resumeFile = null;
    profileUpdate.resumeUrl = '';
  }

  const db = await getDatabase();
  await db.collection('seeker_profiles').updateOne(
    { candidateId: session.user.id },
    { $set: profileUpdate, $setOnInsert: { createdAt: updatedAt } },
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
        name,
        ...(imageValue !== undefined ? { image: imageValue } : {}),
        updatedAt,
      },
    },
  );

  return NextResponse.json({ success: true });
}

function isSafeUrl(value: string, allowedDomains?: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (!allowedDomains) return true;
    return allowedDomains.some(
      (domain) => url.hostname.toLowerCase() === domain || url.hostname.toLowerCase().endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
