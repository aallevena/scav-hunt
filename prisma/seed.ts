import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const creator = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo Creator",
    },
  });

  const tagNames = ["Outdoor", "Downtown", "Family-friendly", "Puzzle", "Historic"];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const tagByName = Object.fromEntries(tags.map((t) => [t.name, t]));

  await prisma.hunt.deleteMany({ where: { creatorId: creator.id } });

  await prisma.hunt.create({
    data: {
      title: "Downtown Landmarks Hunt",
      description:
        "An ordered walking hunt through downtown's most iconic landmarks. Solve each clue's riddle to reveal the next stop.",
      ordered: true,
      published: true,
      creatorId: creator.id,
      tags: {
        create: [
          { tagId: tagByName["Outdoor"].id },
          { tagId: tagByName["Downtown"].id },
          { tagId: tagByName["Historic"].id },
        ],
      },
      clues: {
        create: [
          {
            orderIndex: 0,
            title: "The Old Clock Tower",
            prompt:
              "Find the clock tower in the main square. What year is engraved above the entrance?",
            inputType: "TEXT_PASSWORD",
            verificationConfig: { password: "1892", caseSensitive: false },
            hint: "Look up, above the arched doorway.",
          },
          {
            orderIndex: 1,
            title: "The Riverside Park",
            prompt: "Walk to the riverside park and check in when you arrive.",
            inputType: "GEOLOCATION",
            latitude: 40.7128,
            longitude: -74.006,
            locationLabel: "Riverside Park",
            verificationConfig: { radiusMeters: 75 },
          },
          {
            orderIndex: 2,
            title: "The Farmers Market",
            prompt: "Scan the QR code posted at the market entrance.",
            inputType: "QR_BARCODE",
            verificationConfig: { code: "MARKET-ENTRANCE-01" },
            hint: "It's taped near the ticket booth.",
          },
        ],
      },
    },
  });

  await prisma.hunt.create({
    data: {
      title: "Neighborhood Scavenger Puzzle",
      description:
        "An unordered hunt for families — find all five spots in the neighborhood in any order you like.",
      ordered: false,
      published: true,
      creatorId: creator.id,
      tags: {
        create: [
          { tagId: tagByName["Family-friendly"].id },
          { tagId: tagByName["Puzzle"].id },
        ],
      },
      clues: {
        create: [
          {
            orderIndex: 0,
            title: "The Red Mailbox",
            prompt: "What number is painted on the red mailbox on Elm St?",
            inputType: "TEXT_PASSWORD",
            verificationConfig: { password: "42", caseSensitive: false },
          },
          {
            orderIndex: 1,
            title: "The Community Garden",
            prompt: "Check in at the community garden entrance.",
            inputType: "GEOLOCATION",
            latitude: 40.715,
            longitude: -74.001,
            locationLabel: "Community Garden",
            verificationConfig: { radiusMeters: 100 },
          },
          {
            orderIndex: 2,
            title: "The Library Steps",
            prompt: "Scan the QR code taped to the library's front railing.",
            inputType: "QR_BARCODE",
            verificationConfig: { code: "LIBRARY-STEPS-01" },
          },
        ],
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
