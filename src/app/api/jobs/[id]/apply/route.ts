import { auth } from '@/lib/auth';
import { submitBackendApplication } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Sign in to apply for this job.' }, { status: 401 });
  }
  if (session.user.role !== 'seeker') {
    return NextResponse.json(
      { error: 'Only job seekers can apply for jobs.' },
      { status: 403 },
    );
  }

  const { id: jobId } = await params;
  let submittedDetails: unknown;
  try {
    submittedDetails = await request.json();
  } catch {
    return NextResponse.json({ error: 'Application details must be valid JSON.' }, { status: 400 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Application backend JWT signing secret is not configured');
    return NextResponse.json(
      { error: 'Application service is not configured. Please contact support.' },
      { status: 503 },
    );
  }

  try {
    const application = {
      ...(isRecord(submittedDetails) ? submittedDetails : {}),
      candidateId: session.user.id,
      jobId,
    };
    const { response, data } = await submitBackendApplication(application, apiSecret);
    const backendRecord = isRecord(data) ? data : null;
    const rawBackendMessage =
      typeof backendRecord?.message === 'string'
        ? backendRecord.message
        : typeof backendRecord?.error === 'string'
          ? backendRecord.error
          : '';
    const backendMessage = rawBackendMessage.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 240);

    if (!response.ok) {
      console.error('Application backend rejected submission', {
        status: response.status,
        ...(process.env.NODE_ENV !== 'production' && backendMessage
          ? { message: backendMessage }
          : {}),
      });

      if (response.status === 404) {
        return NextResponse.json({ error: 'This job is no longer available.' }, { status: 404 });
      }
      if (response.status === 409) {
        return NextResponse.json(
          { error: 'You have already applied for this job.', alreadyApplied: true },
          { status: 409 },
        );
      }
      if (response.status === 429 && backendRecord?.error === 'MONTHLY_LIMIT_REACHED') {
        return NextResponse.json(
          {
            error: 'MONTHLY_LIMIT_REACHED',
            message:
              typeof backendRecord.message === 'string'
                ? backendRecord.message
                : 'You have reached your monthly application limit.',
            upgradeRequired: true,
            upgradeUrl: '/dashboard/seeker/upgrade?reason=monthly_limit_reached',
            plan: backendRecord.plan,
            used: backendRecord.used,
            limit: backendRecord.limit,
            remaining: 0,
            resetDate: backendRecord.resetDate,
          },
          { status: 429 },
        );
      }
      if (response.status === 413) {
        return NextResponse.json(
          {
            error:
              'The backend rejected the application because its request body limit is too low. Increase the backend JSON and proxy body limits to at least 8 MB.',
            backendStatus: 413,
          },
          { status: 413 },
        );
      }
      if (response.status === 400) {
        return NextResponse.json(
          { error: backendMessage || 'Please review your application details.' },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: 'The application service could not accept your application. Please try again.',
          backendStatus: response.status,
          ...(process.env.NODE_ENV !== 'production' && backendMessage
            ? { backendMessage }
            : {}),
        },
        { status: 502 },
      );
    }

    if (!backendRecord || typeof backendRecord.applicationId !== 'string') {
      console.error('Application backend returned an invalid success response');
      return NextResponse.json(
        { error: 'The application service returned an invalid response.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Could not submit job application', error);
    return NextResponse.json({ error: 'Could not submit your application.' }, { status: 502 });
  }
}
