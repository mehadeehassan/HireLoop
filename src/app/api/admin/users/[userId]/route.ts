import {
  getActiveAdminSession,
  isAdminSessionResponse,
  type AdminServerSession,
} from '@/lib/admin-server-auth';
import { auth } from '@/lib/auth';
import { isAccountActive, isManagedRole, type ManagedRole } from '@/lib/admin-user-policy';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { NextResponse } from 'next/server';

type AdminSession = AdminServerSession & {
  apiSecret: string;
};

type AdminMutationBody =
  | { action: 'role_change'; role: ManagedRole }
  | { action: 'suspend'; reason?: string }
  | { action: 'unsuspend' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMutationBody(value: unknown): AdminMutationBody | null {
  if (!isRecord(value)) return null;
  if (value.action === 'role_change' && isManagedRole(value.role)) {
    return { action: value.action, role: value.role };
  }
  if (value.action === 'suspend') {
    if (value.reason !== undefined && typeof value.reason !== 'string') return null;
    const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
    if (reason.length > 500) return null;
    return { action: value.action, ...(reason ? { reason } : {}) };
  }
  if (value.action === 'unsuspend') return { action: value.action };
  return null;
}

async function updateAudit(
  context: AdminSession,
  auditId: string,
  status: 'succeeded' | 'failed' | 'partial_failure',
  outcomeCode: string,
) {
  const { response, data } = await fetchBackendWithSecret(
    `/admin/audit/${encodeURIComponent(auditId)}`,
    'PATCH',
    { status, outcomeCode },
    context.apiSecret,
    { id: context.actorId, role: 'admin' },
  );
  if (!response.ok) {
    const message = isRecord(data) && typeof data.message === 'string'
      ? data.message
      : 'Could not finalize the admin audit record.';
    throw new Error(message);
  }
}

function getErrorStatus(error: unknown) {
  if (!isRecord(error)) return 502;
  return typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500
    ? error.statusCode
    : 502;
}

function getErrorMessage(error: unknown) {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : 'The administrative operation failed.';
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const sessionContext = await getActiveAdminSession();
  if (isAdminSessionResponse(sessionContext)) return sessionContext;

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Admin audit service JWT signing secret is not configured');
    return NextResponse.json({ error: 'Admin user management is not configured.' }, { status: 503 });
  }
  const context: AdminSession = { ...sessionContext, apiSecret };

  const { userId } = await params;
  if (!userId.trim() || userId.length > 128) {
    return NextResponse.json({ error: 'A valid user ID is required.' }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'The admin action must be valid JSON.' }, { status: 400 });
  }
  const body = parseMutationBody(rawBody);
  if (!body) {
    return NextResponse.json({ error: 'The requested admin action is invalid.' }, { status: 400 });
  }

  let target;
  try {
    target = await auth.api.getUser({
      query: { id: userId },
      headers: context.headers,
    });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: status === 404 ? 'User not found.' : 'Could not verify the target user.' },
      { status },
    );
  }

  const previousRole = target.role;
  if (!isManagedRole(previousRole)) {
    return NextResponse.json({ error: 'The target user has an unsupported role.' }, { status: 409 });
  }
  const targetIsActive = isAccountActive(target);
  if (body.action === 'role_change' && !targetIsActive) {
    return NextResponse.json({ error: 'Unsuspend the user before changing their role.' }, { status: 409 });
  }
  if (
    (body.action === 'suspend' || body.action === 'role_change') &&
    target.id === context.actorId &&
    (body.action === 'suspend' || body.role !== 'admin')
  ) {
    return NextResponse.json({ error: 'Admins cannot demote or suspend themselves.' }, { status: 409 });
  }
  if (body.action === 'suspend' && !targetIsActive) {
    return NextResponse.json({ success: true, user: { id: target.id, role: previousRole, banned: true } });
  }
  if (body.action === 'unsuspend' && target.banned !== true) {
    return NextResponse.json({ success: true, user: { id: target.id, role: previousRole, banned: false } });
  }
  if (body.action === 'role_change' && body.role === previousRole) {
    return NextResponse.json({
      success: true,
      user: { id: target.id, name: target.name, email: target.email, role: previousRole, banned: false },
    });
  }

  let auditResponse: Response;
  let auditData: unknown;
  try {
    const auditStart = await fetchBackendWithSecret(
      '/admin/audit',
      'POST',
      {
        action: body.action,
        targetUserId: target.id,
        previousRole,
        ...(body.action === 'role_change' ? { nextRole: body.role } : {}),
        ...(body.action === 'suspend' && body.reason ? { reason: body.reason } : {}),
      },
      context.apiSecret,
      { id: context.actorId, role: 'admin' },
    );
    auditResponse = auditStart.response;
    auditData = auditStart.data;
  } catch (error) {
    console.error('Could not start the admin audit record', error);
    return NextResponse.json({ error: 'Could not authorize the admin action.' }, { status: 502 });
  }
  if (!auditResponse.ok || !isRecord(auditData) || typeof auditData.auditId !== 'string') {
    const status = [400, 403, 404, 409, 503].includes(auditResponse.status)
      ? auditResponse.status
      : 502;
    const error = isRecord(auditData) && typeof auditData.message === 'string'
      ? auditData.message
      : 'Could not authorize and record the admin action.';
    return NextResponse.json({ error }, { status });
  }

  const auditId = auditData.auditId;
  let operationApplied = false;
  try {
    if (body.action === 'role_change') {
      await auth.api.setRole({
        body: { userId: target.id, role: body.role },
        headers: context.headers,
      });
      operationApplied = true;
      try {
        await auth.api.revokeUserSessions({
          body: { userId: target.id },
          headers: context.headers,
        });
      } catch (error) {
        await updateAudit(context, auditId, 'partial_failure', 'session_revocation_failed');
        console.error('Role changed but existing Better Auth sessions could not be revoked', error);
        return NextResponse.json(
          {
            error: 'The role changed, but sessions could not be revoked. Retry the operation.',
            actionApplied: true,
          },
          { status: 503 },
        );
      }
    } else if (body.action === 'suspend') {
      await auth.api.banUser({
        body: {
          userId: target.id,
          banReason: body.reason || 'Suspended by an administrator.',
        },
        headers: context.headers,
      });
      operationApplied = true;
    } else {
      await auth.api.unbanUser({
        body: { userId: target.id },
        headers: context.headers,
      });
      operationApplied = true;
    }

    await updateAudit(context, auditId, 'succeeded', 'completed');
    return NextResponse.json({
      success: true,
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: body.action === 'role_change' ? body.role : previousRole,
        banned: body.action === 'suspend',
      },
    });
  } catch (error) {
    try {
      await updateAudit(
        context,
        auditId,
        operationApplied ? 'partial_failure' : 'failed',
        operationApplied ? 'audit_finalization_failed' : 'better_auth_operation_failed',
      );
    } catch (auditError) {
      console.error('Could not record the result of an admin action', auditError);
      return NextResponse.json(
        {
          error: 'The admin action could not be fully audited.',
          actionApplied: operationApplied,
        },
        { status: 503 },
      );
    }
    console.error('Better Auth admin operation failed', error);
    return NextResponse.json(
      {
        error: getErrorMessage(error),
        actionApplied: operationApplied,
      },
      { status: getErrorStatus(error) },
    );
  }
}
