import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma/client";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // Kayıt ol
  app.post("/register", async (req, reply) => {
    const body = RegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      reply.code(409);
      return { error: "Bu email zaten kayıtlı" };
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { email: body.email, name: body.name, passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email });
    reply.code(201);
    return { user, token };
  });

  // Giriş yap
  app.post("/login", async (req, reply) => {
    const body = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      reply.code(401);
      return { error: "Geçersiz email veya şifre" };
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      reply.code(401);
      return { error: "Geçersiz email veya şifre" };
    }

    const token = app.jwt.sign({ id: user.id, email: user.email });
    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  });

  // Profil
  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const userId = (req.user as any).id;
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  });
}
