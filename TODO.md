# TODO

## Deployment

- [ ] Publish container images to GHCR.
  - Build and push multi-arch images to `ghcr.io/jey3dayo/manga-rss-bridge`.
  - Add GitHub Actions for tagged and main-branch image publishing.
  - Switch homelab k3s from the temporary hostPath-mounted checkout to the GHCR image.
  - Use an immutable tag or digest in the k3s manifest before removing the Python fallback.
