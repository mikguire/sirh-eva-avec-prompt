import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { ProblemDetailsSchema } from "./common/http/problem-details.swagger";
import { assertJwtSecretsForProduction } from "./config/jwt-secrets";

async function bootstrap(): Promise<void> {
  assertJwtSecretsForProduction();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy === "true" || trustProxy === "1") {
    app.set("trust proxy", 1);
  }
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("EVA Backend API")
    .setDescription("SaaS RH multi-tenant API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [ProblemDetailsSchema]
  });
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(3000);
}

void bootstrap();
