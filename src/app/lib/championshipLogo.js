import {
  clubStorageFolder,
  platformStoragePath,
} from "@/app/lib/storageLayout";
import {
  getExtensionFromFile,
  uploadClubAsset,
} from "@/app/lib/clubAssetStorage";

export function championshipLogoObjectPath(clubSlug, championshipId, file) {
  const ext = getExtensionFromFile(file);
  return platformStoragePath(
    clubStorageFolder(clubSlug),
    "championships",
    String(championshipId),
    `logo.${ext}`
  );
}

export async function uploadChampionshipLogo(
  supabase,
  { clubSlug, championshipId, file, previousUrlOrPath }
) {
  const objectPath = championshipLogoObjectPath(clubSlug, championshipId, file);
  return uploadClubAsset(supabase, {
    objectPath,
    file,
    previousUrlOrPath,
  });
}
