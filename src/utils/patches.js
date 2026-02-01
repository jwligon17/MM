import { getPatchImageById, getPatchRegistryEntry } from "../patches/patchRegistry";

const resolvePatchImageSource = (id, image) => {
  const registryEntry = getPatchRegistryEntry(id);
  if (registryEntry?.image) return registryEntry.image;

  if (typeof image === "string") {
    const trimmed = image.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return { uri: trimmed };
    }
  }

  if (
    image &&
    typeof image === "object" &&
    typeof image.uri === "string" &&
    image.uri.trim().length
  ) {
    return { ...image, uri: image.uri.trim() };
  }

  return null;
};

export const normalizePatch = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const id =
    raw.id ??
    raw.patchId ??
    raw.patch_id ??
    raw.slug ??
    raw.code ??
    raw.key ??
    null;
  const title =
    raw.title ??
    raw.name ??
    raw.label ??
    raw.patchName ??
    raw.patch_title ??
    null;
  const image =
    raw.image ??
    raw.imageSource ??
    raw.image_url ??
    raw.imageUrl ??
    raw.badgeImage ??
    raw.badge_url ??
    raw.asset ??
    null;

  if (!id && !title && !image) return null;

  const registryEntry = getPatchRegistryEntry(id);
  const resolvedImage = resolvePatchImageSource(id, image);
  if (__DEV__ && id && !resolvedImage) {
    console.warn("[normalizePatch] Missing patch art for id", id);
  }

  return {
    id,
    title: title ?? registryEntry?.displayName ?? null,
    image: resolvedImage ?? (id ? getPatchImageById(id) : null),
    description: registryEntry?.description ?? raw.description ?? null,
  };
};
