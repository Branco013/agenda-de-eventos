import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { verifyAuthToken } from "../authService";

import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { Request } from "express";

import { User } from "../../shared/types";
import * as db from "../db";


// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    const tokenPayload = verifyAuthToken({ req } as any);
    if (!tokenPayload) {
      return null;
    }

    const user = await db.getUserById(tokenPayload.id);
    if (!user) {
      return null;
    }

    return user;
  }
}

export const sdk = new SDKServer();
