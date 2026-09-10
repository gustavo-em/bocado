#!/usr/bin/env bash
#
# Cold-start time to "Hoje", measured the same way twice.
#
# The opening animation is only honest if the number does not move, so the
# number has to be taken on the device, on the same build variant, before and
# after the change:
#
#   git checkout <baseline commit> && npm run android:test-build
#   scripts/measure-launch.sh > /tmp/launch-before.txt
#   git checkout <this branch>   && npm run android:test-build
#   scripts/measure-launch.sh > /tmp/launch-after.txt
#
# Every run is cold: the app is force-stopped first, so nothing is left warm
# between measurements. `am start -W` reports TotalTime, which is the interval
# from the launch request to the first frame of the activity being drawn —
# the same event on both sides, whatever the overlay does afterwards.
#
# The overlay cannot inflate this by construction: it is a sibling of the
# navigator rather than a gate, and its clock only starts on a frame the app
# has already drawn. The measurement is there to prove it, not to assume it.
set -euo pipefail

PACKAGE="${PACKAGE:-com.gustavoem.bocado}"
ACTIVITY="${ACTIVITY:-.MainActivity}"
RUNS="${RUNS:-5}"
SETTLE_SECONDS="${SETTLE_SECONDS:-2}"

# "+1s234ms" or "+842ms", as ActivityTaskManager writes it, into plain ms.
to_ms() {
  case "$1" in
    *s*ms)
      seconds="${1%%s*}"
      rest="${1#*s}"
      echo $((seconds * 1000 + ${rest%ms}))
      ;;
    *ms) echo "${1%ms}" ;;
    *) echo "" ;;
  esac
}

median() {
  sort -n | awk '{ v[NR] = $1 } END {
    if (NR == 0) { print ""; exit }
    print (NR % 2) ? v[(NR + 1) / 2] : int((v[NR / 2] + v[NR / 2 + 1]) / 2)
  }'
}

# --parse recovers the number from a logcat capture that already exists, which
# is how a baseline can still be read off an earlier run's artifacts without
# checking the old commit out and building it again. Android logs
# "Displayed <package>/<activity>: +842ms" on every cold start by itself, so
# any capture wide enough to include ActivityTaskManager carries the number.
if [ "${1:-}" = "--parse" ]; then
  log="${2:-}"
  if [ -z "${log}" ] || [ ! -r "${log}" ]; then
    echo "usage: scripts/measure-launch.sh --parse <logcat-capture>" >&2
    exit 1
  fi
  found=""
  while IFS= read -r raw; do
    value="$(to_ms "${raw}")"
    [ -n "${value}" ] || continue
    echo "displayed: ${value} ms"
    found="${found}${value}
"
  done <<EOF
$(tr -d '\r' < "${log}" \
  | sed -n "s|.*Displayed ${PACKAGE}/[^:]*: *+\([0-9smh]*\).*|\1|p")
EOF
  if [ -z "${found}" ]; then
    echo "no \"Displayed ${PACKAGE}\" line in ${log}" >&2
    exit 1
  fi
  echo
  echo "median Displayed: $(printf '%s' "${found}" | median) ms"
  exit 0
fi

if ! command -v adb > /dev/null 2>&1; then
  echo "adb not found in PATH" >&2
  exit 1
fi

if [ -z "$(adb devices | sed -n '2,$p' | grep -w device || true)" ]; then
  echo "no device attached (adb devices)" >&2
  exit 1
fi

echo "package: ${PACKAGE}${ACTIVITY}"
echo "device:  $(adb shell getprop ro.product.model | tr -d '\r') / Android $(adb shell getprop ro.build.version.release | tr -d '\r')"
echo "runs:    ${RUNS} cold starts"
echo

totals=""
displayeds=""
for run in $(seq 1 "${RUNS}"); do
  adb shell am force-stop "${PACKAGE}"
  adb logcat -c > /dev/null 2>&1 || true
  sleep "${SETTLE_SECONDS}"
  total="$(adb shell am start -W -S -n "${PACKAGE}/${ACTIVITY}" \
    | tr -d '\r' | awk -F': ' '/^TotalTime/ { print $2 }')"
  if [ -z "${total}" ]; then
    echo "run ${run}: no TotalTime reported" >&2
    exit 1
  fi
  # The same event as the system saw it. Printed too, so a harness that keeps
  # only the logcat still ends up holding the measurement.
  displayed="$(to_ms "$(adb logcat -d 2>/dev/null | tr -d '\r' \
    | sed -n "s|.*Displayed ${PACKAGE}/[^:]*: *+\([0-9smh]*\).*|\1|p" \
    | tail -n 1)")"
  echo "run ${run}: TotalTime ${total} ms${displayed:+, Displayed ${displayed} ms}"
  totals="${totals}${total}
"
  [ -z "${displayed}" ] || displayeds="${displayeds}${displayed}
"
done

echo
echo "median TotalTime: $(printf '%s' "${totals}" | median) ms"
[ -z "${displayeds}" ] || echo "median Displayed: $(printf '%s' "${displayeds}" | median) ms"
