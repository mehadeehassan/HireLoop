import { auth } from '@/lib/auth';
import { fetchBackendUsage, fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type RecruiterProfileContext = {
  recruiterId: string;
  apiSecret: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getRecruiterContext(): Promise<RecruiterProfileContext | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Only recruiters can access this profile.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Recruiter profile backend JWT signing secret is not configured');
    return NextResponse.json({ error: 'Profile service is not configured.' }, { status: 503 });
  }

  return { recruiterId: session.user.id, apiSecret };
}

function isResponse(value: RecruiterProfileContext | NextResponse): value is NextResponse {
  return value instanceof Response;
}

function getBackendError(data: unknown, fallback: string) {
  return isRecord(data) && typeof data.message === 'string' ? data.message : fallback;
}

export async function GET() {
  const context = await getRecruiterContext();
  if (isResponse(context)) return context;

  const query = new URLSearchParams({ recruiterId: context.recruiterId }).toString();
  try {
    const [profileResult, usageResult] = await Promise.all([
      fetchBackendWithSecret(
        `/recruiter/profile?${query}`,
        'GET',
        undefined,
        context.apiSecret,
      ),
      fetchBackendUsage('recruiter', context.recruiterId, context.apiSecret),
    ]);

    const profilePayload = isRecord(profileResult.data) ? profileResult.data : null;
    const profile = profilePayload && isRecord(profilePayload.profile) ? profilePayload.profile : null;
    const usage = isRecord(usageResult.data) ? usageResult.data : null;
    if (
      !profileResult.response.ok ||
      !usageResult.response.ok ||
      !profile ||
      typeof usage?.plan !== 'string'
    ) {
      console.error('Recruiter profile backend returned an unsuccessful or invalid response', {
        profileStatus: profileResult.response.status,
        usageStatus: usageResult.response.status,
      });
      return NextResponse.json({ error: 'Could not load recruiter profile.' }, { status: 502 });
    }

    return NextResponse.json({
      recruiterName: typeof profile.recruiterName === 'string' ? profile.recruiterName : '',
      plan: usage.plan,
      companyName: typeof profile.companyName === 'string' ? profile.companyName : '',
      email: typeof profile.email === 'string' ? profile.email : '',
      phone: typeof profile.phone === 'string' ? profile.phone : '',
      companySize: typeof profile.companySize === 'string' ? profile.companySize : '',
      industry: typeof profile.industry === 'string' ? profile.industry : '',
      companyWebsite: typeof profile.companyWebsite === 'string' ? profile.companyWebsite : '',
      companyLogo: typeof profile.companyLogo === 'string' ? profile.companyLogo : '',
      companyDescription:
        typeof profile.companyDescription === 'string' ? profile.companyDescription : '',
      emailNotifications: profile.emailNotifications !== false,
      applicationNotifications: profile.applicationNotifications !== false,
      image: typeof profile.image === 'string' ? profile.image : '',
    });
  } catch (error) {
    console.error('Could not load recruiter profile from backend', error);
    return NextResponse.json({ error: 'Could not load recruiter profile.' }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const context = await getRecruiterContext();
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
      '/recruiter/profile',
      'PATCH',
      { ...value, recruiterId: context.recruiterId },
      context.apiSecret,
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: getBackendError(data, 'Unable to save recruiter profile.') },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      );
    }
    if (!isRecord(data) || data.success !== true || !isRecord(data.profile)) {
      console.error('Recruiter profile backend returned an invalid update response');
      return NextResponse.json({ error: 'Unable to save recruiter profile.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      profile: data.profile,
    });
  } catch (error) {
    console.error('Could not update recruiter profile through backend', error);
    return NextResponse.json({ error: 'Unable to save recruiter profile.' }, { status: 502 });
  }
}
