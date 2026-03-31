const RELEASE_META = {
  appDisplayName: 'Greenpan Design',
  appPackageName: 'greenpan-app',
  appVersion: '0.0.1',
  releaseArtifactBaseName: 'Greenpan-Design-Setup',
  internalReleaseTrack: 'internal',
};

const normalizeText = (value) => {
  const text = String(value ?? '').trim();
  return text || null;
};

const normalizeIsoDate = (value) => {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const APP_DISPLAY_NAME = normalizeText(RELEASE_META.appDisplayName) || 'Greenpan Design';
export const APP_PACKAGE_NAME = normalizeText(RELEASE_META.appPackageName) || 'greenpan-app';
export const APP_VERSION = normalizeText(RELEASE_META.appVersion) || '0.0.0-dev';
export const RELEASE_CHANNEL = APP_VERSION.includes('-') ? 'pre-release' : 'stable';
export const RELEASE_ARTIFACT_BASENAME = normalizeText(RELEASE_META.releaseArtifactBaseName)
  || `${APP_DISPLAY_NAME} Setup`;
export const INTERNAL_RELEASE_TRACK = normalizeText(RELEASE_META.internalReleaseTrack) || 'internal';

export const resolveReleaseChannel = (version = APP_VERSION) => (
  String(version ?? APP_VERSION).includes('-') ? 'pre-release' : 'stable'
);

export const buildReleaseStamp = (version = APP_VERSION) => `${APP_DISPLAY_NAME} v${version}`;

export const buildReleaseCaption = ({ version = APP_VERSION, exportedAt = null } = {}) => {
  const stamp = buildReleaseStamp(version);
  if (!exportedAt) return stamp;

  const date = new Date(exportedAt);
  if (Number.isNaN(date.getTime())) return stamp;
  return `${stamp} · ${date.toISOString()}`;
};

export const buildInternalReleaseStamp = ({
  version = APP_VERSION,
  exportedAt = null,
  track = INTERNAL_RELEASE_TRACK,
} = {}) => {
  const stamp = buildReleaseStamp(version);
  const normalizedTrack = normalizeText(track) || INTERNAL_RELEASE_TRACK;
  const normalizedExportedAt = normalizeIsoDate(exportedAt);
  return normalizedExportedAt
    ? `${stamp} · ${normalizedTrack} · ${normalizedExportedAt}`
    : `${stamp} · ${normalizedTrack}`;
};

export const buildInternalReleaseBundleLabel = ({
  artifactScope = null,
  version = APP_VERSION,
  exportedAt = null,
  track = INTERNAL_RELEASE_TRACK,
} = {}) => {
  const normalizedScope = normalizeText(artifactScope) || 'release-bundle';
  return `${normalizedScope} | ${buildInternalReleaseStamp({ version, exportedAt, track })}`;
};

export const resolveRuntimeAppVersion = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized) return normalized;
  }
  return APP_VERSION;
};
