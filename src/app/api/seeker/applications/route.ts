import { auth } from '@/lib/auth';
import { fetchBackendApplications } from '@/lib/job-api';
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
  if (session.user.role !== 'seeker') {
    return NextResponse.json(
      { error: 'Only job seekers can view their applications.' },
      { status: 403 },
    );
  }

  const apiSecret = process.env.HIRELOOP_APPLICATIONS_API_SECRET;
  if (!apiSecret) {
    console.error('Application backend API secret is not configured');
    return NextResponse.json(
      { error: 'Application service is not configured. Please contact support.' },
      { status: 503 },
    );
  }

  try {
    const { response, data } = await fetchBackendApplications(session.user.id, apiSecret);
    if (!response.ok) {
      console.error('Application backend list request failed', response.status);
      return NextResponse.json(
        {
          error:
            response.status === 404
              ? 'The backend is missing GET /applications?candidateId=.... Add the authenticated seeker-application list route and restart the backend.'
              : 'Could not load your applications from the application service.',
          backendStatus: response.status,
        },
        { status: response.status === 404 ? 503 : 502 },
      );
    }

    const records = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.applications)
        ? data.applications
        : null;
    if (!records) {
      console.error('Application backend returned an unexpected list response');
      return NextResponse.json(
        { error: 'The application service returned an unexpected response.' },
        { status: 502 },
      );
    }

    const applications = records
      .filter(
        (application): application is Record<string, unknown> =>
          isRecord(application) &&
          application.candidateId === session.user.id &&
          application.isDummy !== true,
      )
      .map((application) => {
        const createdAt =
          typeof application.createdAt === 'string'
            ? application.createdAt
            : application.createdAt instanceof Date
              ? application.createdAt.toISOString()
              : '';

        return {
          id: getId(application.id) || getId(application._id),
          jobId: typeof application.jobId === 'string' ? application.jobId : '',
          jobTitle:
            typeof application.jobTitle === 'string'
              ? application.jobTitle
              : typeof application.role === 'string'
                ? application.role
                : 'Job application',
          company:
            typeof application.company === 'string' ? application.company : 'Company not listed',
          status: typeof application.status === 'string' ? application.status : 'New',
          name: typeof application.name === 'string' ? application.name : '',
          email: typeof application.email === 'string' ? application.email : '',
          phone: typeof application.phone === 'string' ? application.phone : '',
          location: typeof application.location === 'string' ? application.location : '',
          experience: typeof application.experience === 'string' ? application.experience : '',
          skills:
            typeof application.skills === 'string' || Array.isArray(application.skills)
              ? application.skills
              : [],
          coverLetter: typeof application.coverLetter === 'string' ? application.coverLetter : '',
          type: typeof application.type === 'string' ? application.type : '',
          workMode: typeof application.workMode === 'string' ? application.workMode : '',
          createdAt,
          date: createdAt
            ? new Date(createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
              })
            : '',
        };
      })
      .filter((application) => application.id);

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Could not load applications from backend', error);
    return NextResponse.json(
      { error: 'Could not connect to the application service.' },
      { status: 502 },
    );
  }
}
