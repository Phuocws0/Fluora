import type { ErrorRequestHandler, Request, Response } from "express";

/** An expected API failure that is returned to the client as `{ error: { code, message } }`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({ error: { code, message } });
}

export function apiNotFound(_request: Request, response: Response): void {
  sendError(response, 404, "NOT_FOUND", "The requested API endpoint does not exist.");
}

function hasBodyParserType(error: unknown, type: string): boolean {
  return typeof error === "object" && error !== null && "type" in error && error.type === type;
}

export const jsonErrorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    sendError(response, error.status, error.code, error.message);
    return;
  }

  if (hasBodyParserType(error, "entity.parse.failed")) {
    sendError(response, 400, "VALIDATION_ERROR", "The request body must be valid JSON.");
    return;
  }

  if (hasBodyParserType(error, "entity.too.large")) {
    sendError(response, 413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
    return;
  }

  console.error("Unhandled API error:", error);
  sendError(response, 500, "INTERNAL_SERVER_ERROR", "Could not complete the request.");
};
