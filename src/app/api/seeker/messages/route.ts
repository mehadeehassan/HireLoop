import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type MessageContext = {
  candidateId: string;
  apiSecret: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getMessageContext(): Promise<MessageContext | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Sign in to view messages.' }, { status: 401 });
  }
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can access messages.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Messaging backend JWT signing secret is not configured');
    return NextResponse.json(
      { error: 'Messaging is not configured yet.' },
      { status: 503 },
    );
  }

  return { candidateId: session.user.id, apiSecret };
}

function isResponse(value: MessageContext | NextResponse): value is NextResponse {
  return value instanceof Response;
}

function getBackendError(status: number) {
  if (status === 404) {
    return 'The backend is missing the seeker messages API. Add GET and POST /messages routes.';
  }
  if (status === 401 || status === 403) {
    return 'The backend rejected the messaging service token. Check that the server-only JWT signing secret matches in both apps.';
  }
  return 'The messaging service could not complete this request.';
}

export async function GET() {
  const context = await getMessageContext();
  if (isResponse(context)) return context;

  try {
    const query = new URLSearchParams({ candidateId: context.candidateId }).toString();
    const { response, data } = await fetchBackendWithSecret(
      `/messages?${query}`,
      'GET',
      undefined,
      context.apiSecret,
    );
    if (!response.ok) {
      console.error('Messaging backend list request failed', response.status);
      return NextResponse.json(
        { error: getBackendError(response.status) },
        { status: response.status === 404 ? 503 : 502 },
      );
    }

    const records =
      isRecord(data) && Array.isArray(data.conversations) ? data.conversations : null;
    if (!records) {
      console.error('Messaging backend returned an unexpected conversation list');
      return NextResponse.json(
        { error: 'The messaging service returned an unexpected response.' },
        { status: 502 },
      );
    }

    const conversations = records
      .filter(
        (conversation): conversation is Record<string, unknown> =>
          isRecord(conversation) &&
          conversation.candidateId === context.candidateId &&
          typeof conversation.id === 'string' &&
          typeof conversation.recruiterId === 'string' &&
          typeof conversation.participantName === 'string' &&
          isRecord(conversation.lastMessage) &&
          typeof conversation.lastMessage.body === 'string' &&
          typeof conversation.lastMessage.senderId === 'string',
      )
      .map((conversation) => {
        const lastMessage = conversation.lastMessage as Record<string, unknown>;
        const jobId =
          typeof conversation.jobId === 'string' && conversation.jobId.trim().length > 0
            ? conversation.jobId.trim()
            : 'direct';
        return {
          id: conversation.id,
          candidateId: context.candidateId,
          recruiterId: conversation.recruiterId,
          jobId,
          participantName: conversation.participantName,
          jobTitle: typeof conversation.jobTitle === 'string' ? conversation.jobTitle : '',
          unreadCount:
            Number.isInteger(conversation.unreadCount) && Number(conversation.unreadCount) > 0
              ? Number(conversation.unreadCount)
              : 0,
          lastMessage: {
            body: lastMessage.body,
            senderId: lastMessage.senderId,
            createdAt: typeof lastMessage.createdAt === 'string' ? lastMessage.createdAt : '',
          },
        };
      });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Could not load seeker conversations', error);
    return NextResponse.json(
      { error: 'Could not connect to the messaging service.' },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const context = await getMessageContext();
  if (isResponse(context)) return context;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Message must be valid JSON.' }, { status: 400 });
  }
  const conversationId =
    isRecord(payload) && typeof payload.conversationId === 'string'
      ? payload.conversationId.trim()
      : '';
  const body =
    isRecord(payload) && typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!conversationId || conversationId.length > 200 || !body || body.length > 2000) {
    return NextResponse.json(
      { error: 'Choose a conversation and enter a message of 1–2,000 characters.' },
      { status: 400 },
    );
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      '/messages',
      'POST',
      { candidateId: context.candidateId, conversationId, body },
      context.apiSecret,
    );
    if (!response.ok) {
      console.error('Messaging backend send request failed', response.status);
      return NextResponse.json(
        { error: getBackendError(response.status) },
        { status: response.status === 404 ? 503 : 502 },
      );
    }
    if (
      !isRecord(data) ||
      typeof data.id !== 'string' ||
      typeof data.body !== 'string' ||
      typeof data.senderId !== 'string' ||
      data.senderId !== context.candidateId ||
      data.candidateId !== context.candidateId ||
      data.conversationId !== conversationId
    ) {
      console.error('Messaging backend returned an invalid sent message');
      return NextResponse.json(
        { error: 'The messaging service returned an unexpected response.' },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        message: {
          id: data.id,
          body: data.body,
          senderId: data.senderId,
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Could not send seeker message', error);
    return NextResponse.json(
      { error: 'Could not connect to the messaging service.' },
      { status: 502 },
    );
  }
}
