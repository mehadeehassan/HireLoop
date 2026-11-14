import { auth } from '@/lib/auth';
import { fetchBackendUsage, fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type SeekerProfileContext = {
  candidateId: string;
  apiSecret: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getSeekerContext(): Promise<SeekerProfileContext | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can access this profile.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Seeker profile backend JWT signing secret is not configured');
    return NextResponse.json({ error: 'Profile service is not configured.' }, { status: 503 });
  }

  return { candidateId: session.user.id, apiSecret };
}

function isResponse(value: SeekerProfileContext | NextResponse): value is NextResponse {
  return value instanceof Response;
}

function getBackendError(data: unknown, fallback: string) {
  return isRecord(data) && typeof data.message === 'string' ? data.message : fallback;
}

export async function GET() {
  const context = await getSeekerContext();
  if (isResponse(context)) return context;

  const query = new URLSearchParams({ candidateId: context.candidateId }).toString();
  try {
    const [profileResult, usageResult] = await Promise.all([
      fetchBackendWithSecret(
        `/seeker/profile?${query}`,
        'GET',
        undefined,
        context.apiSecret,
      ),
      fetchBackendUsage('seeker', context.candidateId, context.apiSecret),
    ]);

    const profilePayload = isRecord(profileResult.data) ? profileResult.data : null;
    const profile = profilePayload && isRecord(profilePayload.profile) ? profilePayload.profile : null;
    if (
      !profileResult.response.ok ||
      !usageResult.response.ok ||
      !profile ||
      typeof usageResult.data !== 'object' ||
      usageResult.data === null ||
      !('plan' in usageResult.data) ||
      typeof usageResult.data.plan !== 'string'
    ) {
      console.error('Seeker profile backend returned an unsuccessful or invalid response', {
        profileStatus: profileResult.response.status,
        usageStatus: usageResult.response.status,
      });
      return NextResponse.json({ error: 'Could not load seeker profile.' }, { status: 502 });
    }

    return NextResponse.json({
      name: typeof profile.name === 'string' ? profile.name : '',
      email: typeof profile.email === 'string' ? profile.email : '',
      plan: usageResult.data.plan,
      headline: typeof profile.headline === 'string' ? profile.headline : '',
      bio: typeof profile.bio === 'string' ? profile.bio : '',
      hasResume: profile.hasResume === true,
      resumeFileName: typeof profile.resumeFileName === 'string' ? profile.resumeFileName : '',
      phone: typeof profile.phone === 'string' ? profile.phone : '',
      location: typeof profile.location === 'string' ? profile.location : '',
      experience: typeof profile.experience === 'string' ? profile.experience : '',
      skills: typeof profile.skills === 'string' ? profile.skills : '',
      linkedinUrl: typeof profile.linkedinUrl === 'string' ? profile.linkedinUrl : '',
      resumeUrl: typeof profile.resumeUrl === 'string' ? profile.resumeUrl : '',
      portfolioUrl: typeof profile.portfolioUrl === 'string' ? profile.portfolioUrl : '',
      coverLetter: typeof profile.coverLetter === 'string' ? profile.coverLetter : '',
      image: typeof profile.image === 'string' ? profile.image : '',
    });
  } catch (error) {
    console.error('Could not load seeker profile from backend', error);
    return NextResponse.json({ error: 'Could not load seeker profile.' }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const context = await getSeekerContext();
  if (isResponse(context)) return context;

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: 'Profile details must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(value)) {
    return NextResponse.json({ error: 'Please provide valid profile details.' }, { status: 400 });
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      '/seeker/profile',
      'PATCH',
      { ...value, candidateId: context.candidateId },
      context.apiSecret,
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: getBackendError(data, 'Could not save your profile.') },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      );
    }
    if (!isRecord(data) || data.success !== true) {
      console.error('Seeker profile backend returned an invalid update response');
      return NextResponse.json({ error: 'Could not save your profile.' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Could not update seeker profile through backend', error);
    return NextResponse.json({ error: 'Could not save your profile.' }, { status: 502 });
  }
}
