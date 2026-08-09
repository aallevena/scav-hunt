import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const clueSchema = z
  .object({
    title: z.string().min(1),
    prompt: z.string().min(1),
    hint: z.string().optional(),
    inputType: z.enum(["TEXT_PASSWORD", "GEOLOCATION", "QR_BARCODE"]),
    password: z.string().optional(),
    caseSensitive: z.boolean().optional(),
    code: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    locationLabel: z.string().optional(),
    radiusMeters: z.number().optional(),
  })
  .superRefine((clue, ctx) => {
    if (clue.inputType === "TEXT_PASSWORD" && !clue.password) {
      ctx.addIssue({
        code: "custom",
        message: "Password is required for text password clues.",
        path: ["password"],
      });
    }
    if (clue.inputType === "QR_BARCODE" && !clue.code) {
      ctx.addIssue({
        code: "custom",
        message: "Code is required for QR/barcode clues.",
        path: ["code"],
      });
    }
    if (
      clue.inputType === "GEOLOCATION" &&
      (clue.latitude === undefined || clue.longitude === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Latitude and longitude are required for geolocation clues.",
        path: ["latitude"],
      });
    }
  });

const huntSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  ordered: z.boolean(),
  published: z.boolean(),
  tagNames: z.array(z.string().min(1)).default([]),
  clues: z.array(clueSchema).min(1),
});

function buildVerificationConfig(clue: z.infer<typeof clueSchema>) {
  switch (clue.inputType) {
    case "TEXT_PASSWORD":
      return {
        password: clue.password,
        caseSensitive: Boolean(clue.caseSensitive),
      };
    case "QR_BARCODE":
      return { code: clue.code };
    case "GEOLOCATION":
      return { radiusMeters: clue.radiusMeters ?? 100 };
    default:
      return {};
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const json = await request.json();
  const parsed = huntSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid hunt data.", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const hunt = await prisma.$transaction(async (tx) => {
    const tags = await Promise.all(
      data.tagNames.map((name) =>
        tx.tag.upsert({ where: { name }, update: {}, create: { name } })
      )
    );

    return tx.hunt.create({
      data: {
        title: data.title,
        description: data.description,
        ordered: data.ordered,
        published: data.published,
        creatorId: session.user.id,
        tags: { create: tags.map((t) => ({ tagId: t.id })) },
        clues: {
          create: data.clues.map((clue, index) => ({
            orderIndex: index,
            title: clue.title,
            prompt: clue.prompt,
            hint: clue.hint || null,
            inputType: clue.inputType,
            latitude: clue.latitude ?? null,
            longitude: clue.longitude ?? null,
            locationLabel: clue.locationLabel || null,
            verificationConfig: buildVerificationConfig(clue),
          })),
        },
      },
    });
  });

  return NextResponse.json({ id: hunt.id });
}
