# TODO

## Deployment

- [x] Publish container images to GHCR.
  - Build and push multi-arch images to `ghcr.io/jey3dayo/manga-rss-bridge`.
  - Add GitHub Actions for tagged and main-branch image publishing.
  - Switch homelab k3s from the temporary hostPath-mounted checkout to the GHCR image.
  - Use an immutable tag or digest in the k3s manifest before removing the Python fallback.

  Completed and verified 2026-11-25: the GHCR index carries linux/amd64 and
  linux/arm64 manifests, `.github/workflows/ghcr.yml` publishes on main pushes
  and `v*.*.*` tags, the homelab manga-feeds deployment runs the GHCR image
  pinned by digest with no hostPath volume, and no Python fallback remains in
  the manifests or on the host (the repository contains no Python code).
