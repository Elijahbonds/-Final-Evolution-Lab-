#!/usr/bin/env bash
# Copy Elijah's dunk BVH from FEL-unity into public/assets/.
set -euo pipefail
DEST="$(cd "$(dirname "$0")/.." && pwd)/public/assets/basketball_dunk__elijah.bvh"
TOKEN="${FEL_UNITY_CLONE_TOKEN:-${GH_TOKEN:-${GITHUB_TOKEN:-}}}"
AUTH=()
if [[ -n "${TOKEN}" ]]; then
  AUTH=(-c "http.extraHeader=Authorization: Bearer ${TOKEN}")
fi
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT
set +e
git "${AUTH[@]}" clone --depth 1 --filter=blob:none --sparse \
  "https://github.com/Elijahbonds/FEL-unity.git" "$TMP/fel" 2>"$TMP/err"
clone_ok=$?
set -e
if [[ $clone_ok -ne 0 ]]; then
  echo "FEL-unity clone failed:" >&2
  cat "$TMP/err" >&2
  exit 7
fi
git -C "$TMP/fel" sparse-checkout set assets/mocap_bvh/basketball_dunk__elijah.bvh
SRC="$TMP/fel/assets/mocap_bvh/basketball_dunk__elijah.bvh"
if [[ ! -f "$SRC" ]]; then
  echo "missing $SRC" >&2
  exit 8
fi
cp "$SRC" "$DEST"
echo "copied $(wc -c < "$DEST") bytes -> $DEST"
