import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Sign in to view messages.' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can access messages.' }, { status: 403 });
  }
  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: 'Messaging is not configured yet.' }, { status: 503 });
  }

  const { conversationId } = await params;
  const query = new URLSearchParams({ candidateId: session.user.id }).toString();
  try {
    const { response, data } = await fetchBackendWithSecret(
      `/messages/${encodeURIComponent(conversationId)}?${query}`,
      'GET',
      undefined,
      apiSecret,
    );
    if (!response.ok) {
      console.error('Messaging backend thread request failed', response.status);
      return NextResponse.json(
        {
          error:
            response.status === 404
              ? 'The backend is missing GET /messages/:conversationId.'
              : 'Could not load this conversation.',
        },
        { status: response.status === 404 ? 503 : 502 },
      );
    }

    if (
      !isRecord(data) ||
      data.candidateId !== session.user.id ||
      data.conversationId !== conversationId ||
      !Array.isArray(data.messages)
    ) {
      return NextResponse.json(
        { error: 'The messaging service returned an unexpected response.' },
        { status: 502 },
      );
    }
    const messages = data.messages
      .filter(
        (message): message is Record<string, unknown> =>
          isRecord(message) &&
          message.conversationId === conversationId &&
          typeof message.id === 'string' &&
          typeof message.senderId === 'string' &&
          typeof message.body === 'string',
      )
      .map((message) => ({
        id: message.id,
        senderId: message.senderId,
        body: message.body,
        createdAt: typeof message.createdAt === 'string' ? message.createdAt : '',
      }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Could not load seeker message thread', error);
    return NextResponse.json(
      { error: 'Could not connect to the messaging service.' },
      { status: 502 },
    );
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Sign in to update messages.' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can update messages.' }, { status: 403 });
  }
  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: 'Messaging is not configured yet.' }, { status: 503 });
  }

  const { conversationId } = await params;
  try {
    const { response } = await fetchBackendWithSecret(
      `/messages/${encodeURIComponent(conversationId)}/read`,
      'PATCH',
      { candidateId: session.user.id },
      apiSecret,
    );
    if (!response.ok) {
      console.error('Messaging backend mark-read request failed', response.status);
      return NextResponse.json(
        { error: 'Could not update the conversation read status.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Could not mark seeker conversation read', error);
    return NextResponse.json(
      { error: 'Could not connect to the messaging service.' },
      { status: 502 },
    );
  }
}
