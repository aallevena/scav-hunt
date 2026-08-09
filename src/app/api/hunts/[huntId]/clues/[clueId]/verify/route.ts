import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyClueSubmission } from "@/lib/verify-clue";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ huntId: string; clueId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const userId = session.user.id;

  const { huntId, clueId } = await params;
  const submission = (await request.json()) as Record<string, unknown>;

  const clue = await prisma.clue.findUnique({
    where: { id: clueId },
    include: { hunt: { include: { clues: true } } },
  });

  if (!clue || clue.huntId !== huntId) {
    return NextResponse.json({ error: "Clue not found." }, { status: 404 });
  }

  // Ordered hunts: only the current clue may be submitted against.
  if (clue.hunt.ordered) {
    const progress = await prisma.huntProgress.findUnique({
      where: { userId_huntId: { userId, huntId } },
    });
    const currentIndex = progress?.currentClueIndex ?? 0;
    if (clue.orderIndex !== currentIndex) {
      return NextResponse.json(
        { error: "This clue isn't unlocked yet." },
        { status: 409 }
      );
    }
  }

  const result = verifyClueSubmission(
    clue.inputType,
    clue.verificationConfig,
    submission,
    { latitude: clue.latitude, longitude: clue.longitude }
  );

  if (!result.correct) {
    return NextResponse.json(
      { correct: false, message: result.message },
      { status: 200 }
    );
  }

  const totalClues = clue.hunt.clues.length;

  await prisma.$transaction(async (tx) => {
    await tx.clueCompletion.upsert({
      where: { userId_clueId: { userId, clueId } },
      update: {},
      create: { userId, clueId, attemptData: submission },
    });

    const progress = await tx.huntProgress.upsert({
      where: { userId_huntId: { userId, huntId } },
      update: {},
      create: {
        userId,
        huntId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        currentClueIndex: 0,
      },
    });

    const completedCount = await tx.clueCompletion.count({
      where: { userId, clue: { huntId } },
    });

    const isDone = completedCount >= totalClues;
    const nextIndex = clue.hunt.ordered
      ? Math.max(progress.currentClueIndex, clue.orderIndex + 1)
      : progress.currentClueIndex;

    await tx.huntProgress.update({
      where: { userId_huntId: { userId, huntId } },
      data: {
        currentClueIndex: nextIndex,
        status: isDone ? "COMPLETED" : "IN_PROGRESS",
        completedAt: isDone ? new Date() : null,
      },
    });
  });

  return NextResponse.json({ correct: true });
}
