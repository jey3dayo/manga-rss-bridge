# TODO

## Deployment

All items completed as of 2026-11-25; kept as a record.

- [x] Publish container images to GHCR.
  - Build and push multi-arch images to `ghcr.io/jey3dayo/manga-rss-bridge`.
  - Add GitHub Actions for tagged and main-branch image publishing.
    (`.github/workflows/ghcr.yml`: runs on `main` pushes and `v*.*.*` tags.)
  - Switch homelab k3s from the temporary hostPath-mounted checkout to the GHCR image.
  - Use an immutable tag or digest in the k3s manifest before removing the Python fallback.
    (homelab-k3s `apps/services/manga-feeds/deployment.yaml` pins the image by
    `sha256` digest; no Python sources remain in this repository.)
