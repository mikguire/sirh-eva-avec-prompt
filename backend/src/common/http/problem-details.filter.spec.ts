import {
  ArgumentsHost,
  ConflictException,
  HttpStatus,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { ProblemDetailsExceptionFilter } from "./problem-details.filter";

describe("ProblemDetailsExceptionFilter", () => {
  it("formats HttpException as RFC 7807 problem", () => {
    const filter = new ProblemDetailsExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn().mockReturnValue({ status });
    const response = { setHeader, status };
    const request = { originalUrl: "/api/v1/auth/login", url: "/api/v1/auth/login" };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request
      })
    } as unknown as ArgumentsHost;

    filter.catch(new UnauthorizedException("Invalid credentials"), host);

    expect(setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/problem+json; charset=utf-8"
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "about:blank",
        title: "Unauthorized",
        status: HttpStatus.UNAUTHORIZED,
        detail: "Invalid credentials",
        instance: "/api/v1/auth/login"
      })
    );
  });

  it("propagates ev:code from HttpException payload", () => {
    const filter = new ProblemDetailsExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn().mockReturnValue({ status });
    const response = { setHeader, status };
    const request = {
      originalUrl: "/api/v1/leave-requests/x/approve",
      url: "/api/v1/leave-requests/x/approve"
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request
      })
    } as unknown as ArgumentsHost;

    filter.catch(
      new ConflictException({
        message: "Solde insuffisant",
        "ev:code": "EV_LEAVE_INSUFFICIENT_BALANCE"
      }),
      host
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.CONFLICT,
        "ev:code": "EV_LEAVE_INSUFFICIENT_BALANCE",
        detail: "Solde insuffisant"
      })
    );
  });

  it("formats ThrottlerException as 429 problem", () => {
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const filter = new ProblemDetailsExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn().mockReturnValue({ status });
    const response = { setHeader, status };
    const request = {
      method: "GET",
      originalUrl: "/api/v1/employees",
      url: "/api/v1/employees"
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request
      })
    } as unknown as ArgumentsHost;

    try {
      filter.catch(new ThrottlerException(), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.TOO_MANY_REQUESTS,
          title: "Too Many Requests"
        })
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/rate_limited method=GET path=\/api\/v1\/employees eva\.http_status=429/)
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
