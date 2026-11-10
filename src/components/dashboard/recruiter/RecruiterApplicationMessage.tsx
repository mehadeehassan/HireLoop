'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getError(value: unknown) {
  return isRecord(value) && typeof value.error === 'string'
    ? value.error
    : 'Could not load messages.';
}

export default function RecruiterApplicationMessage({
  application,
  recruiterId,
  onClose,
}: {
  application: {
    candidateId: string;
    jobId: string;
    name: string;
    role: string;
  };
  recruiterId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadThread = useCallback(async (signal?: AbortSignal) => {
    try {
      if (!signal?.aborted) setError('');
      const query = new URLSearchParams({
        candidateId: application.candidateId,
        jobId: application.jobId,
      });
      const listResponse = await fetch(`/api/recruiter/messages?${query}`, {
        cache: 'no-store',
        signal,
      });
      const listData: unknown = await listResponse.json();
      if (!listResponse.ok) throw new Error(getError(listData));
      const conversations =
        isRecord(listData) && Array.isArray(listData.conversations)
          ? listData.conversations
          : null;
      if (!conversations) throw new Error('The messaging service returned an unexpected response.');
      const conversation = conversations.find(
        (item) =>
          isRecord(item) &&
          item.candidateId === application.candidateId &&
          typeof item.id === 'string',
      );
      if (!conversation) {
        setMessages([]);
        return;
      }

      const threadResponse = await fetch(
        `/api/recruiter/messages/${encodeURIComponent(conversation.id as string)}`,
        { cache: 'no-store', signal },
      );
      const threadData: unknown = await threadResponse.json();
      if (!threadResponse.ok) throw new Error(getError(threadData));
      if (!isRecord(threadData) || !Array.isArray(threadData.messages)) {
        throw new Error('The messaging service returned an unexpected conversation.');
      }
      const threadMessages = threadData.messages.filter(
        (message): message is Message =>
          isRecord(message) &&
          typeof message.id === 'string' &&
          typeof message.senderId === 'string' &&
          typeof message.body === 'string',
      );
      setMessages(threadMessages);
      await fetch(`/api/recruiter/messages/${encodeURIComponent(conversation.id as string)}`, {
        method: 'PATCH',
        signal,
      });
    } catch (loadError) {
      if (signal?.aborted) return;
      console.error('Could not load recruiter applicant conversation', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Could not load messages.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [application.candidateId, application.jobId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadThread(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadThread]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/recruiter/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: application.candidateId,
          jobId: application.jobId,
          body,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getError(payload));
      if (!isRecord(payload) || !isRecord(payload.message)) {
        throw new Error('The messaging service returned an unexpected message.');
      }
      const message = payload.message;
      if (
        typeof message.id !== 'string' ||
        typeof message.senderId !== 'string' ||
        typeof message.body !== 'string'
      ) {
        throw new Error('The messaging service returned an invalid message.');
      }
      setMessages((current) => [
        ...current,
        {
          id: message.id as string,
          senderId: message.senderId as string,
          body: message.body as string,
          createdAt: typeof message.createdAt === 'string' ? message.createdAt : new Date().toISOString(),
        },
      ]);
      setDraft('');
    } catch (sendError) {
      console.error('Could not send recruiter message to applicant', sendError);
      setError(sendError instanceof Error ? sendError.message : 'Could not send this message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6">
      <section role="dialog" aria-modal="true" aria-label={`Message ${application.name}`} className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#303a55] bg-[#111827]">
        <header className="flex items-center justify-between border-b border-[#252d43] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#edf0f7]">Message {application.name}</h2>
            <p className="mt-1 truncate text-[10px] text-[#858da1]">{application.role}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close conversation" className="size-8 rounded-md border border-[#303a55] text-lg text-[#aab1c1]">×</button>
        </header>
        {error && <p role="alert" className="mx-4 mt-3 rounded-md bg-red-500/5 p-3 text-[10px] leading-5 text-red-300">{error}</p>}
        <div className="flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto p-4">
          {loading ? (
            <p className="py-8 text-center text-[10px] text-[#858da1]">Loading conversation…</p>
          ) : messages.length ? (
            messages.map((message) => (
              <div key={message.id} className={`max-w-[85%] rounded-lg px-3 py-2 ${message.senderId === recruiterId ? 'ml-auto bg-[#5148b8] text-white' : 'bg-[#222b3c] text-[#e2e2e8]'}`}>
                <p className="whitespace-pre-wrap break-words text-[11px] leading-5">{message.body}</p>
                <time className="mt-1 block text-right text-[8px] opacity-65">
                  {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
                </time>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-[10px] text-[#858da1]">Start the conversation with this applicant.</p>
          )}
        </div>
        <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-[#252d43] p-4">
          <label className="sr-only" htmlFor="recruiter-applicant-message">Write a message</label>
          <textarea
            id="recruiter-applicant-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Write a message…"
            className="min-h-10 flex-1 resize-none rounded-md border border-[#303a55] bg-[#171e31] px-3 py-2 text-[11px] text-white outline-none placeholder:text-[#858da1] focus:border-[#8178ff]"
          />
          <button type="submit" disabled={!draft.trim() || sending} className="rounded-md bg-white px-4 py-2.5 text-[10px] font-semibold text-[#171719] disabled:cursor-not-allowed disabled:opacity-40">
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  );
}
