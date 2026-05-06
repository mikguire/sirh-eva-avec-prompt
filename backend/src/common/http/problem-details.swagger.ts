import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiResponse, getSchemaPath } from "@nestjs/swagger";

/**
 * Schéma OpenAPI pour les réponses d’erreur RFC 7807 (`application/problem+json`).
 */
export class ProblemDetailsSchema {
  @ApiProperty({ example: "about:blank" })
  type!: string;

  @ApiProperty({ example: "Unauthorized" })
  title!: string;

  @ApiProperty({ example: 401 })
  status!: number;

  @ApiProperty({ example: "Invalid credentials" })
  detail!: string;

  @ApiProperty({ example: "/api/v1/auth/login" })
  instance!: string;

  @ApiPropertyOptional({ example: "EV_UNIQUE_VIOLATION", description: "Code métier / technique (extension)" })
  "ev:code"?: string;
}

function problemJsonResponse(status: number, description: string) {
  return ApiResponse({
    status,
    description,
    content: {
      "application/problem+json": {
        schema: { $ref: getSchemaPath(ProblemDetailsSchema) }
      }
    }
  });
}

/**
 * Erreurs courantes des routes **JWT + tenant** (401 / 403 / 429) + schéma Problem Details.
 */
export function ApiProblemResponsesForAuthedRoutes(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiBearerAuth(),
    problemJsonResponse(401, "JWT absent ou invalide, ou tenant (`x-tenant-id`) incohérent"),
    problemJsonResponse(403, "Permission RBAC insuffisante"),
    problemJsonResponse(429, "Quota de requêtes dépassé (rate limiting)")
  );
}
