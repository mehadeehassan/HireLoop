import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { isBlockedAdminMutation, requestsRoleChange } from "@/lib/auth-http-guard";

const handlers = toNextJsHandler(auth);

export function GET(request: Request) {
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const { pathname } = new URL(request.url);
  if (isBlockedAdminMutation(pathname, request.method)) {
    return NextResponse.json(
      { error: "Use the protected administrative user-management API." },
      { status: 404 },
    );
  }

  if (pathname === "/api/auth/update-user") {
    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      body = null;
    }
    if (requestsRoleChange(pathname, request.method, body)) {
      return NextResponse.json(
        { error: "User roles can only be changed by an active administrator." },
        { status: 403 },
      );
    }
  }

  return handlers.POST(request);
}