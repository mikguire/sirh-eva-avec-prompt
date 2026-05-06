import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { Request, Response } from "express";

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  /** Code métier optionnel (extension, voir STANDARDS.md). */
  "ev:code"?: string;
};

const DEFAULT_TYPE = "about:blank";

function titleForHttpStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "Bad Request";
    case HttpStatus.UNAUTHORIZED:
      return "Unauthorized";
    case HttpStatus.FORBIDDEN:
      return "Forbidden";
    case HttpStatus.NOT_FOUND:
      return "Not Found";
    case HttpStatus.CONFLICT:
      return "Conflict";
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return "Unprocessable Entity";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "Too Many Requests";
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return "Internal Server Error";
    default:
      if (status >= 500) {
        return "Internal Server Error";
      }
      if (status >= 400) {
        return "Client Error";
      }
      return "Error";
  }
}

function detailFromHttpPayload(payload: string | object, fallbackMessage: string): string {
  if (typeof payload === "string") {
    return payload;
  }
  const body = payload as Record<string, unknown>;
  if (Array.isArray(body.message)) {
    return body.message.map(String).join("; ");
  }
  if (typeof body.message === "string") {
    return body.message;
  }
  if (typeof body.error === "string" && typeof body.message !== "string") {
    return body.error;
  }
  return fallbackMessage;
}

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = titleForHttpStatus(status);
    let detail = "Une erreur inattendue s'est produite.";
    let type = DEFAULT_TYPE;
    let evCode: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      title = titleForHttpStatus(status);
      detail = detailFromHttpPayload(exception.getResponse(), exception.message);
    } else if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        status = HttpStatus.CONFLICT;
        title = titleForHttpStatus(status);
        detail = "Une ressource avec cette valeur unique existe déjà.";
        evCode = "EV_UNIQUE_VIOLATION";
      } else if (exception.code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        title = titleForHttpStatus(status);
        detail = "Enregistrement introuvable.";
        evCode = "EV_NOT_FOUND";
      } else {
        detail = exception.message;
        evCode = `EV_PRISMA_${exception.code}`;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    const instance = (request.originalUrl ?? request.url) || "/";

    const problem: ProblemDetails = {
      type,
      title,
      status,
      detail,
      instance
    };
    if (evCode) {
      problem["ev:code"] = evCode;
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      const method = request.method ?? "UNKNOWN";
      this.logger.warn(`rate_limited method=${method} path=${instance} eva.http_status=429`);
    }

    response.setHeader("Content-Type", "application/problem+json; charset=utf-8");
    response.status(status).json(problem);
  }
}
