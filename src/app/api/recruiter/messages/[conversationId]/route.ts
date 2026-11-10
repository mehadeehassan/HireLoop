import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getRecruiterContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.user.role !== 'recruiter') {
    return { error: NextResponse.json({ error: 'Only recruiters can access messages.' }, { status: 403 }) };
  }
  const apiSecret = process.env.HIRELOOP_APPLICATIONS_API_SECRET;
  if (!apiSecret) return { error: NextResponse.json({ error: 'Messaging is not configured.' }, { status: 503 }) };
  return { recruiterId: session.user.id, apiSecret };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const context = await getRecruiterContext();
  if ('error' in context) return context.error;
  const { conversationId } = await params;
  const query = new URLSearchParams({ recruiterId: context.recruiterId });

  try {
    const { response, data } = await fetchBackendWithSecret(
      `/recruiter/messages/${encodeURIComponent(conversationId)}?${query}`,
      'GET',
      undefined,
      context.apiSecret,
    );
    if (!response.ok) {
      console.error('Recruiter message thread request failed', response.status);
      return NextResponse.json(
        { error: response.status === 404 ? 'Conversation not found.' : 'Could not load this conversation.' },
        { status: response.status === 404 ? 404 : 502 },
      );
    }
    if (
      !isRecord(data) ||
      data.recruiterId !== context.recruiterId ||
      data.conversationId !== conversationId ||
      !Array.isArray(data.messages)
    ) {
      return NextResponse.json({ error: 'The messaging service returned an unexpected response.' }, { status: 502 });
    }
    const messages = data.messages.filter(
      (message): message is Record<string, unknown> =>
        isRecord(message) &&
        message.conversationId === conversationId &&
        typeof message.id === 'string' &&
        typeof message.senderId === 'string' &&
        typeof message.body === 'string',
    );
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Could not load recruiter message thread', error);
    return NextResponse.json({ error: 'Could not connect to the messaging service.' }, { status: 502 });
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const context = await getRecruiterContext();
  if ('error' in context) return context.error;
  const { conversationId } = await params;

  try {
    const { response } = await fetchBackendWithSecret(
      `/recruiter/messages/${encodeURIComponent(conversationId)}/read`,
      'PATCH',
      { recruiterId: context.recruiterId },
      context.apiSecret,
    );
    if (!response.ok) {
      return NextResponse.json({ error: 'Could not mark this conversation as read.' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Could not mark recruiter conversation read', error);
    return NextResponse.json({ error: 'Could not connect to the messaging service.' }, { status: 502 });
  }
}
