import { NextResponse } from "next/server";
import {
  ApiError,
  api,
  equal,
  isEditor,
  newSession,
} from "../../../lib/server";
const attempts: number[] = [];
export async function POST(request: Request) {
  if (
    request.headers.get("origin") !==
    (process.env.APP_ORIGIN ?? "http://127.0.0.1:3000")
  )
    return NextResponse.json({ error: "Origin rejected" }, { status: 403 });
  try {
    const body = await request.json();
    if (body.action === "login") {
      while (attempts.length && attempts[0] < Date.now() - 60000)
        attempts.shift();
      if (attempts.length >= 10)
        return NextResponse.json(
          { error: "Too many attempts. Try again in a minute." },
          { status: 429 },
        );
      attempts.push(Date.now());
      if (
        typeof body.password !== "string" ||
        !process.env.ADMIN_PASSWORD ||
        !equal(body.password, process.env.ADMIN_PASSWORD)
      )
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 },
        );
      const response = NextResponse.json({ ok: true });
      response.cookies.set("ci_session", newSession(), {
        httpOnly: true,
        sameSite: "strict",
        secure:
          new URL(process.env.APP_ORIGIN ?? "http://127.0.0.1:3000")
            .protocol === "https:",
        path: "/",
        maxAge: 28800,
      });
      return response;
    }
    if (!(await isEditor()))
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (body.action === "logout") {
      const response = NextResponse.json({ ok: true });
      response.cookies.delete("ci_session");
      return response;
    }
    if (
      !["research-collect", "research-review", "research-evidence"].includes(
        body.action,
      )
    )
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return NextResponse.json(
      await api(`/admin/${body.action}`, {
        method: "POST",
        body: JSON.stringify(body.payload),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      {
        status:
          error instanceof ApiError
            ? error.status
            : error instanceof SyntaxError
              ? 400
              : 500,
      },
    );
  }
}
