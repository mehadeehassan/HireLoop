'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

type Conversation = {
  id: string;
  candidateId: string;
  recruiterId: string;
  jobId: string;
  participantName: string;
  jobTitle: string;
  unreadCount: number;
  lastMessage: { body: string; senderId: string; createdAt: string };
};

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type Candidate = {
  id: string;
  name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getError(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : fallback;
}

function formatTime(value: string) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
}

export default function RecruiterMessagesMenu({ recruiterId }: { recruiterId: string }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const unreadCount = useMemo(
    () => conversations.reduce((count, conversation) => count + conversation.unreadCount, 0),
    [conversations],
  );

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/recruiter/messages', { cache: 'no-store' });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getError(payload, 'Could not load messages.'));
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.conversations) ||
        !payload.conversations.every(
          (conversation) =>
            isRecord(conversation) &&
            typeof conversation.id === 'string' &&
            typeof conversation.candidateId === 'string' &&
            typeof conversation.recruiterId === 'string' &&
            typeof conversation.jobId === 'string' &&
            typeof conversation.participantName === 'string' &&
            typeof conversation.jobTitle === 'string' &&
            typeof conversation.unreadCount === 'number' &&
            isRecord(conversation.lastMessage) &&
            typeof conversation.lastMessage.body === 'string',
        )
      ) {
        throw new Error('The messaging service returned an unexpected response.');
      }
      setConversations(payload.conversations as Conversation[]);
    } catch (loadError) {
      console.error('Could not load recruiter messages', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (conversation: Conversation) => {
    setSelected(conversation);
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/recruiter/messages/${encodeURIComponent(conversation.id)}`,
        { cache: 'no-store' },
      );
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getError(payload, 'Could not load this conversation.'));
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.messages) ||
        !payload.messages.every(
          (message) =>
            isRecord(message) &&
            typeof message.id === 'string' &&
            typeof message.senderId === 'string' &&
            typeof message.body === 'string',
        )
      ) {
        throw new Error('The messaging service returned an unexpected conversation.');
      }
      setMessages(payload.messages as Message[]);
      const readResponse = await fetch(
        `/api/recruiter/messages/${encodeURIComponent(conversation.id)}`,
        { method: 'PATCH' },
      );
      const readPayload: unknown = await readResponse.json();
      if (!readResponse.ok) {
        throw new Error(getError(readPayload, 'Could not mark this conversation as read.'));
      }
      setConversations((current) =>
        current.map((item) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item),
      );
    } catch (loadError) {
      console.error('Could not load recruiter conversation', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Could not load this conversation.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function searchCandidates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (query.length < 2 || searching) return;
    setSearching(true);
    setError('');
    setCandidates([]);
    try {
      const response = await fetch(
        `/api/recruiter/candidates?q=${encodeURIComponent(query)}`,
        { cache: 'no-store' },
      );
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getError(payload, 'Could not search seekers.'));
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.candidates) ||
        !payload.candidates.every(
          (candidate) =>
            isRecord(candidate) &&
            typeof candidate.id === 'string' &&
            typeof candidate.name === 'string',
        )
      ) {
        throw new Error('The seeker directory returned an unexpected response.');
      }
      setCandidates(payload.candidates as Candidate[]);
    } catch (searchError) {
      console.error('Could not search seekers for recruiter message', searchError);
      setError(searchError instanceof Error ? searchError.message : 'Could not search seekers.');
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!recruiterId) return;
    const timer = window.setTimeout(() => void loadConversations(), 0);
    return () => window.clearTimeout(timer);
  }, [loadConversations, recruiterId]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    const refreshTimer = selected ? null : window.setInterval(() => void loadConversations(), 15_000);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [loadConversations, open, selected]);

  useEffect(() => {
    if (!open || !selected || selected.id.startsWith('new:')) return;
    let active = true;
    const refreshTimer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/recruiter/messages/${encodeURIComponent(selected.id)}`,
          { cache: 'no-store' },
        );
        const payload: unknown = await response.json();
        if (
          active &&
          response.ok &&
          isRecord(payload) &&
          Array.isArray(payload.messages) &&
          payload.messages.every(
            (message) =>
              isRecord(message) &&
              typeof message.id === 'string' &&
              typeof message.senderId === 'string' &&
              typeof message.body === 'string',
          )
        ) {
          setMessages(payload.messages as Message[]);
        }
      } catch (refreshError) {
        console.error('Could not refresh recruiter conversation', refreshError);
      }
    }, 8_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [open, selected]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!selected || !body || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/recruiter/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selected.candidateId,
          ...(selected.jobId !== 'direct' ? { jobId: selected.jobId } : {}),
          body,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getError(payload, 'Could not send this message.'));
      const message = isRecord(payload) ? payload.message : null;
      if (
        !isRecord(message) ||
        typeof message.id !== 'string' ||
        typeof message.conversationId !== 'string' ||
        typeof message.senderId !== 'string' ||
        typeof message.body !== 'string'
      ) {
        throw new Error('The messaging service returned an invalid sent message.');
      }
      const sentMessage: Message = {
        id: message.id,
        senderId: message.senderId,
        body: message.body,
        createdAt:
          typeof message.createdAt === 'string' ? message.createdAt : new Date().toISOString(),
      };
      setMessages((current) => [
        ...current,
        sentMessage,
      ]);
      if (selected.jobId === 'direct') {
        setSelected((current) =>
          current
            ? {
                ...current,
                id: message.conversationId as string,
                lastMessage: {
                  body: sentMessage.body,
                  senderId: sentMessage.senderId,
                  createdAt: sentMessage.createdAt,
                },
              }
            : current,
        );
      }
      setDraft('');
      void loadConversations();
    } catch (sendError) {
      console.error('Could not send recruiter message', sendError);
      setError(sendError instanceof Error ? sendError.message : 'Could not send this message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Messages${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (open) setOpen(false);
          else {
            setOpen(true);
            setSelected(null);
            void loadConversations();
          }
        }}
        className="relative transition hover:text-[#e8ebf3]"
      >
        <svg viewBox="0 0 24 24" className="size-4.75" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#6258ff] px-1 text-[8px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section
          role="dialog"
          aria-label="Recruiter messages"
          className="absolute right-0 top-full z-50 mt-3 flex max-h-[min(34rem,calc(100vh-6rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[#29292f] bg-[#141417] text-[#ededf3] shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-[#29292f] px-4 py-3">
            {selected && (
              <button
                type="button"
                aria-label="Back to messages"
                onClick={() => {
                  setSelected(null);
                  setMessages([]);
                  setError('');
                  void loadConversations();
                }}
                className="text-sm text-[#aaa2ff] hover:text-white"
              >
                ←
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xs font-semibold">{selected?.participantName || 'Messages'}</h2>
              <p className="mt-1 truncate text-[9px] text-[#85858e]">{selected?.jobTitle || 'Applicant conversations'}</p>
            </div>
            {!selected && !composing && (
              <button
                type="button"
                onClick={() => {
                  setComposing(true);
                  setCandidates([]);
                  setSearch('');
                  setError('');
                }}
                className="rounded-md border border-[#39334f] px-2.5 py-1.5 text-[9px] text-[#c5c0ff] hover:bg-white/5"
              >
                New message
              </button>
            )}
            <button type="button" aria-label="Close messages" onClick={() => setOpen(false)} className="text-lg leading-none text-[#85858e] hover:text-white">×</button>
          </div>
          {error && <p role="alert" className="m-3 rounded-md bg-red-500/5 p-2.5 text-[10px] leading-5 text-red-300">{error}</p>}
          {selected ? (
            <>
              <div className="flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto p-3">
                {loading ? (
                  <p className="py-8 text-center text-[10px] text-[#85858e]">Loading conversation…</p>
                ) : messages.length ? (
                  messages.map((message) => (
                    <div key={message.id} className={`max-w-[85%] rounded-lg px-3 py-2 ${message.senderId === recruiterId ? 'ml-auto bg-[#5148b8] text-white' : 'bg-[#222228] text-[#e2e2e8]'}`}>
                      <p className="whitespace-pre-wrap break-words text-[10px] leading-5">{message.body}</p>
                      <time className="mt-1 block text-right text-[8px] opacity-65">{formatTime(message.createdAt)}</time>
                    </div>
                  ))
                ) : !error ? (
                  <p className="py-8 text-center text-[10px] text-[#85858e]">No messages in this conversation yet.</p>
                ) : null}
              </div>
              <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-[#29292f] p-3">
                <label className="sr-only" htmlFor="recruiter-message-reply">Write a reply</label>
                <textarea
                  id="recruiter-message-reply"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={2000}
                  rows={2}
                  placeholder="Write a reply…"
                  className="min-h-10 flex-1 resize-none rounded-md border border-[#303036] bg-[#101013] px-3 py-2 text-[10px] text-white outline-none placeholder:text-[#777780] focus:border-[#8178ff]"
                />
                <button type="submit" disabled={!draft.trim() || sending} className="rounded-md bg-white px-3 py-2.5 text-[9px] font-semibold text-[#171719] hover:bg-[#dedee3] disabled:cursor-not-allowed disabled:opacity-40">
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            </>
          ) : composing ? (
            <div className="p-4">
              <form onSubmit={searchCandidates} className="flex gap-2">
                <label className="sr-only" htmlFor="recruiter-seeker-search">Search seekers by name</label>
                <input
                  id="recruiter-seeker-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCandidates([]);
                  }}
                  minLength={2}
                  maxLength={80}
                  placeholder="Search seekers by name"
                  className="min-w-0 flex-1 rounded-md border border-[#303036] bg-[#101013] px-3 py-2 text-[10px] text-white outline-none placeholder:text-[#777780] focus:border-[#8178ff]"
                />
                <button
                  type="submit"
                  disabled={search.trim().length < 2 || searching}
                  className="rounded-md bg-[#6258ff] px-3 py-2 text-[9px] font-medium text-white disabled:opacity-40"
                >
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </form>
              {candidates.length ? (
                <ul className="mt-3 divide-y divide-[#242428]">
                  {candidates.map((candidate) => (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected({
                            id: `new:${candidate.id}`,
                            candidateId: candidate.id,
                            recruiterId,
                            jobId: 'direct',
                            participantName: candidate.name,
                            jobTitle: 'Direct message',
                            unreadCount: 0,
                            lastMessage: { body: '', senderId: '', createdAt: '' },
                          });
                          setMessages([]);
                          setComposing(false);
                          setError('');
                        }}
                        className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-white/[0.035]"
                      >
                        <span className="flex size-8 items-center justify-center rounded-full bg-[#292637] text-[10px] font-semibold text-[#c8c4ff]">
                          {candidate.name.trim().slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-[#e2e2e8]">{candidate.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : !searching && search.trim().length >= 2 ? (
                <p className="py-8 text-center text-[10px] text-[#85858e]">No seekers found. Search by their name.</p>
              ) : (
                <p className="py-8 text-center text-[10px] text-[#85858e]">Search for a seeker to start a conversation.</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setComposing(false);
                  setCandidates([]);
                  setError('');
                }}
                className="mt-2 text-[9px] text-[#aaa2ff] hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((row) => <div key={row} className="h-14 animate-pulse rounded bg-white/5" />)}</div>
          ) : conversations.length ? (
            <ul className="max-h-80 divide-y divide-[#242428] overflow-y-auto">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button type="button" onClick={() => void loadThread(conversation)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-white/[0.035]">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#292637] text-[10px] font-semibold text-[#c8c4ff]">
                      {conversation.participantName.trim().slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-medium text-[#e2e2e8]">{conversation.participantName}</span>
                        {conversation.unreadCount > 0 && <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#6258ff] text-[8px] text-white">{conversation.unreadCount}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-[8px] text-[#aaa2ff]">{conversation.jobTitle}</span>
                      <span className="mt-1 block truncate text-[9px] text-[#85858e]">{conversation.lastMessage.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !error ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[10px] font-medium text-[#d9d9df]">No conversations yet</p>
              <p className="mt-1 text-[9px] leading-5 text-[#85858e]">Start a message with any seeker by name.</p>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
