import { auth } from '@/lib/auth';
import { fetchBackendJobs } from '@/lib/job-api';
import { getDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Only recruiters can view recruiter jobs.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 6));

  try {
    const { response, data } = await fetchBackendJobs('GET');
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Could not load jobs from backend' },
        { status: response.status },
      );
    }
    const payload = data as
      | { jobs?: Record<string, unknown>[]; total?: number }
      | Record<string, unknown>[];
    const allJobs = Array.isArray(payload) ? payload : payload.jobs || [];
    const ownedJobs = allJobs.filter(
      (job: { recruiterId?: string }) => !job.recruiterId || job.recruiterId === session.user.id,
    );
    const total = Array.isArray(payload) ? ownedJobs.length : (payload.total ?? ownedJobs.length);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const jobs = ownedJobs
      .map((job: Record<string, unknown>) => ({
        ...job,
        id: String(job.id || job._id || ''),
        _id: undefined,
      }))
      .slice((page - 1) * limit, page * limit);
    const jobIds = jobs.map((job) => job.id).filter(Boolean);
    const applications = jobIds.length
      ? await (await getDatabase())
          .collection('applications')
          .find(
            {
              recruiterId: session.user.id,
              isDummy: { $ne: true },
              jobId: { $in: jobIds },
            },
            { projection: { jobId: 1 } },
          )
          .toArray()
      : [];
    const applicantCounts = new Map<string, number>();
    for (const application of applications) {
      const jobId = String(application.jobId);
      applicantCounts.set(jobId, (applicantCounts.get(jobId) || 0) + 1);
    }
    const jobsWithApplicantCounts = jobs.map((job) => ({
      ...job,
      applicants: applicantCounts.get(job.id) || 0,
    }));

    return NextResponse.json({
      jobs: jobsWithApplicantCounts,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backend error';
    return NextResponse.json(
      { error: 'Could not connect to job backend', details: message },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Only recruiters can publish jobs.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return NextResponse.json({ error: 'Job details must be a JSON object.' }, { status: 400 });
    }
    body = value as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Job details must be valid JSON.' }, { status: 400 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Job backend JWT signing secret is not configured');
    return NextResponse.json({ error: 'Job service is not configured.' }, { status: 503 });
  }

  try {
    const { response, data } = await fetchBackendJobs('POST', {
      apiSecret,
      body: {
        ...body,
        recruiterId: session.user.id,
        company: body.company || session.user.name || '',
        status: body.status || 'Active',
        applicants: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (!response.ok) {
      if (response.status === 429) return NextResponse.json(data, { status: 429 });
      return NextResponse.json(
        { error: 'Backend job creation failed', details: data },
        { status: response.status },
      );
    }

    const result =
      typeof data === 'object' && data !== null
        ? (data as { insertedId?: string | { toString?: () => string } })
        : null;
    return NextResponse.json(
      { id: result?.insertedId?.toString?.() || result?.insertedId || null },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backend error';
    return NextResponse.json(
      { error: 'Could not connect to job backend', details: message },
      { status: 502 },
    );
  }
}
