import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { ProblemDetailsSchema } from "../../common/http/problem-details.swagger";

@ApiTags("auth")
@ApiExtraModels(ProblemDetailsSchema)
@Throttle({ default: { limit: 25, ttl: 60_000 } })
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Jetons d’accès et de rafraîchissement" })
  @ApiResponse({
    status: 401,
    description: "Identifiants ou tenant invalides (RFC 7807)",
    content: {
      "application/problem+json": {
        schema: { $ref: getSchemaPath(ProblemDetailsSchema) }
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: "Trop de requêtes (rate limiting)",
    content: {
      "application/problem+json": {
        schema: { $ref: getSchemaPath(ProblemDetailsSchema) }
      }
    }
  })
  login(@Body() dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Nouveaux jetons" })
  @ApiResponse({
    status: 401,
    description: "Refresh invalide ou révoqué",
    content: {
      "application/problem+json": {
        schema: { $ref: getSchemaPath(ProblemDetailsSchema) }
      }
    }
  })
  refresh(@Body() dto: RefreshDto): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshDto): Promise<{ success: true }> {
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }
}
