#!/usr/bin/env bash
# Snapshot the working tree and run disposable services, never the Dokploy application.
set -euo pipefail
workbine_root=$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)
workbine_run=$(mktemp -d /tmp/workbine-local-tests.XXXXXX)
export WORKBINE_TEST_SOURCE="$workbine_run/source.tar"
export WORKBINE_TEST_ARTIFACTS="$workbine_run/artifacts"
export LOCAL_UID="$(id -u)" LOCAL_GID="$(id -g)"
mkdir -p "$WORKBINE_TEST_ARTIFACTS"
cd "$workbine_root"
# Include uncommitted work; exclude ignored credentials, dependencies and generated files.
git ls-files --cached --others --exclude-standard -z | tar --null --exclude=.env -T - -cf "$WORKBINE_TEST_SOURCE"
workbine_compose=(docker compose -p "workbine-tests-$$" -f "$workbine_root/docker/testing/compose.yml")
cleanup() {
    workbine_status=$?
    trap - EXIT
    "${workbine_compose[@]}" down --remove-orphans >/dev/null 2>&1 || true
    printf '\nLocal test artifacts: %s\n' "$WORKBINE_TEST_ARTIFACTS"
    exit "$workbine_status"
}
trap cleanup EXIT
docker volume create workbine-testing-composer-cache >/dev/null
docker volume create workbine-testing-npm-cache >/dev/null
"${workbine_compose[@]}" build checks
"${workbine_compose[@]}" run --rm checks 2>&1 | tee "$workbine_run/checks.log"
