#!/bin/sh

_perf() {
  perf stat -B -e cache-references,cache-misses,cycles,instructions,branches,faults,migrations -r 1024 $1 > /dev/null
}

_cc() {
  gcc $1.c -o $1_debug -g3 -O0
  gcc $1.c -o $1_release -O3
  gcc $1.c -o $1_debug.s -g3 -O0 -S
  gcc $1.c -o $1_release.s -O3 -S
}

echo "--- Building binaries"
_cc one
_cc two

echo "--- Checking output"
./one_debug
./two_debug
[ "$(./one_debug)" = "$(./two_debug)" ] && echo "  Debug matches" || { echo " Debug mismatch"; exit 1; }
./one_release
./two_release
[ "$(./one_release)" = "$(./two_release)" ] && echo "  Release matches" || { echo " Release mismatch"; exit 1; }

echo "--- Running perf"
_perf one_debug
_perf two_debug
_perf one_release
_perf two_release
