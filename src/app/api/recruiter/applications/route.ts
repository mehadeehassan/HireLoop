import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getId(value: unknown) {
  if (typeof value === 'string') return value;
  if (isRecord(value) && typeof value.$oid === 'string') return value.$oid;
  return '';
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json(
      { error: 'Only recruiters can view recruiter applications.' },
      { status: 403 },
    );
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Application backend JWT signing secret is not configured');
    return NextResponse.json(
      { error: 'Application service is not configured.' },
      { status: 503 },
    );
  }

  try {
    const query = new URLSearchParams({ recruiterId: session.user.id }).toString();
    const { response, data } = await fetchBackendWithSecret(
      `/recruiter/applications?${query}`,
      'GET',
      undefined,
      apiSecret,
    );
    if (!response.ok) {
      console.error('Recruiter application backend list request failed', response.status);
      return NextResponse.json(
        { error: 'Could not load applications from the application service.' },
        { status: 502 },
      );
    }

    const records = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.applications)
        ? data.applications
        : null;
    if (!records) {
      console.error('Recruiter application backend returned an unexpected list response');
      return NextResponse.json(
        { error: 'The application service returned an unexpected response.' },
        { status: 502 },
      );
    }

    const applications = records
      .filter(
        (application): application is Record<string, unknown> =>
          isRecord(application) &&
          application.recruiterId === session.user.id &&
          application.isDummy !== true &&
          typeof application.candidateId === 'string' &&
          typeof application.jobId === 'string',
      )
      .map((application) => {
        const createdAt =
          typeof application.createdAt === 'string'
            ? application.createdAt
            : application.createdAt instanceof Date
              ? application.createdAt.toISOString()
              : '';
        const name = typeof application.name === 'string' ? application.name : '';
        const role =
          typeof application.jobTitle === 'string'
            ? application.jobTitle
            : typeof application.role === 'string'
              ? application.role
              : 'Job application';

        return {
          id: getId(application.id) || getId(application._id),
          candidateId: application.candidateId,
          recruiterId: application.recruiterId,
          jobId: application.jobId,
          name,
          initials:
            typeof application.initials === 'string'
              ? application.initials
              : name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0].toUpperCase())
                  .join(''),
          role,
          email: typeof application.email === 'string' ? application.email : '',
          experience: typeof application.experience === 'string' ? application.experience : '',
          status: typeof application.status === 'string' ? application.status : 'New',
          date: createdAt
            ? new Date(createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
              })
            : '',
          phone: typeof application.phone === 'string' ? application.phone : '',
          location: typeof application.location === 'string' ? application.location : '',
          skills: Array.isArray(application.skills)
            ? application.skills.filter((skill): skill is string => typeof skill === 'string')
            : [],
          summary: typeof application.summary === 'string' ? application.summary : '',
        };
      })
      .filter((application) => application.id);

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Could not load recruiter applications from backend', error);
    return NextResponse.json(
      { error: 'Could not connect to the application service.' },
      { status: 502 },
    );
  }
}
