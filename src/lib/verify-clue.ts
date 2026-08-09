import type { ClueInputType } from "@/generated/prisma/enums";

type VerifyResult = { correct: boolean; message?: string };

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function verifyClueSubmission(
  inputType: ClueInputType,
  verificationConfig: unknown,
  submission: Record<string, unknown>,
  clueLocation: { latitude: number | null; longitude: number | null }
): VerifyResult {
  const config = (verificationConfig ?? {}) as Record<string, unknown>;

  switch (inputType) {
    case "TEXT_PASSWORD": {
      const submitted = String(submission.answer ?? "").trim();
      const expected = String(config.password ?? "");
      const caseSensitive = Boolean(config.caseSensitive);
      const match = caseSensitive
        ? submitted === expected
        : submitted.toLowerCase() === expected.toLowerCase();
      return match
        ? { correct: true }
        : { correct: false, message: "That's not quite right." };
    }

    case "GEOLOCATION": {
      const lat = Number(submission.latitude);
      const lon = Number(submission.longitude);
      if (
        Number.isNaN(lat) ||
        Number.isNaN(lon) ||
        clueLocation.latitude === null ||
        clueLocation.longitude === null
      ) {
        return { correct: false, message: "Location unavailable." };
      }
      const radiusMeters = Number(config.radiusMeters ?? 100);
      const distance = haversineMeters(
        lat,
        lon,
        clueLocation.latitude,
        clueLocation.longitude
      );
      return distance <= radiusMeters
        ? { correct: true }
        : {
            correct: false,
            message: `You're about ${Math.round(distance)}m away — get closer.`,
          };
    }

    case "QR_BARCODE": {
      const submitted = String(submission.code ?? "").trim();
      const expected = String(config.code ?? "");
      return submitted === expected
        ? { correct: true }
        : { correct: false, message: "That code doesn't match this clue." };
    }

    case "PHOTO_MATCH":
      return {
        correct: false,
        message: "Photo match clues aren't supported yet.",
      };

    default:
      return { correct: false, message: "Unsupported clue type." };
  }
}
