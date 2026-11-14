import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getRecruiterContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.role !== 'recruiter') {
    return {
      error: NextResponse.json(
        { error: 'Only recruiters can access messages.' },
        { status: 403 },
      ),
    };
  }
  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    return {
      error: NextResponse.json({ error: 'Messaging is not configured.' }, { status: 503 }),
    };
  }
  return { recruiterId: session.user.id, apiSecret };
}

export async function GET(request: Request) {
  const context = await getRecruiterContext();
  if ('error' in context) return context.error;

  const search = new URL(request.url).searchParams;
  const query = new URLSearchParams({ recruiterId: context.recruiterId });
  const candidateId = search.get('candidateId');
  const jobId = search.get('jobId');
  if (candidateId) query.set('candidateId', candidateId);
  if (jobId) query.set('jobId', jobId);

  try {
    const { response, data } = await fetchBackendWithSecret(
      `/recruiter/messages?${query}`,
      'GET',
      undefined,
      context.apiSecret,
    );
    if (!response.ok) {
      console.error('Recruiter messaging list request failed', response.status);
      return NextResponse.json(
        {
          error:
            response.status === 404
              ? 'The backend is missing GET /recruiter/messages.'
              : 'Could not load recruiter messages.',
        },
        { status: response.status === 404 ? 503 : 502 },
      );
    }

    const items = isRecord(data) && Array.isArray(data.conversations) ? data.conversations : null;
    if (!items) {
      return NextResponse.json(
        { error: 'The messaging service returned an unexpected response.' },
        { status: 502 },
      );
    }
    const conversations = items
      .filter(
        (item): item is Record<string, unknown> =>
          isRecord(item) &&
          item.recruiterId === context.recruiterId &&
          typeof item.id === 'string' &&
          typeof item.candidateId === 'string' &&
          typeof item.participantName === 'string' &&
          typeof item.jobTitle === 'string' &&
          typeof item.unreadCount === 'number',
      )
      .map((item) => {
        const jobId =
          typeof item.jobId === 'string' && item.jobId.trim().length > 0 ? item.jobId.trim() : 'direct';
        const lastMessage = isRecord(item.lastMessage) ? item.lastMessage : { body: '', senderId: '', createdAt: '' };
        return {
          id: item.id,
          candidateId: item.candidateId,
          recruiterId: item.recruiterId,
          jobId,
          participantName: item.participantName,
          jobTitle: item.jobTitle,
          unreadCount: Number(item.unreadCount),
          lastMessage: {
            body: typeof lastMessage.body === 'string' ? lastMessage.body : '',
            senderId: typeof lastMessage.senderId === 'string' ? lastMessage.senderId : '',
            createdAt: typeof lastMessage.createdAt === 'string' ? lastMessage.createdAt : '',
          },
        };
      });
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Could not load recruiter conversations', error);
    return NextResponse.json(
      { error: 'Could not connect to the messaging service.' },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const context = await getRecruiterContext();
  if ('error' in context) return context.error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Message must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(payload)) {
    return NextResponse.json({ error: 'A valid message is required.' }, { status: 400 });
  }
  const candidateId = typeof payload.candidateId === 'string' ? payload.candidateId.trim() : '';
  if (
    payload.jobId !== undefined &&
    (typeof payload.jobId !== 'string' || !payload.jobId.trim())
  ) {
    return NextResponse.json({ error: 'Job id must be a non-empty string when provided.' }, { status: 400 });
  }
  const jobId = typeof payload.jobId === 'string' ? payload.jobId.trim() : undefined;
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!candidateId || !body || body.length > 2000) {
    return NextResponse.json(
      { error: 'A candidate and a message of 1–2,000 characters are required.' },
      { status: 400 },
    );
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      '/recruiter/messages',
      'POST',
      { recruiterId: context.recruiterId, candidateId, ...(jobId ? { jobId } : {}), body },
      context.apiSecret,
    );
    if (!response.ok) {
      console.error('Recruiter message send request failed', response.status);
      const backendMessage =
        isRecord(data) && typeof data.message === 'string' ? data.message : '';
      const targetNotFound =
        backendMessage === 'Seeker not found' || backendMessage === 'Application not found';
      return NextResponse.json(
        {
          error:
            response.status !== 404
              ? 'The messaging service could not send this message.'
              : targetNotFound
                ? 'The seeker or application could not be found.'
                : 'The backend is missing POST /recruiter/messages.',
        },
        {
          status:
            response.status === 404 && targetNotFound
              ? 404
              : response.status === 404
                ? 503
                : 502,
        },
      );
    }
    if (
      !isRecord(data) ||
      typeof data.id !== 'string' ||
      typeof data.conversationId !== 'string' ||
      data.candidateId !== candidateId ||
      data.recruiterId !== context.recruiterId ||
      data.senderId !== context.recruiterId ||
      typeof data.body !== 'string'
    ) {
      console.error('Messaging backend returned an invalid recruiter message');
      return NextResponse.json(
        { error: 'The messaging service returned an unexpected response.' },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        message: {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          body: data.body,
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Could not send recruiter message', error);
    return NextResponse.json(
      { error: 'Could not connect to the messaging service.' },
      { status: 502 },
    );
  }
}
