#!/usr/bin/env bash
# Scaffold a new Atlas app from the Blueprint engine.
#
#   tools/scaffold_app.sh <dir> <AppName> <storagePrefix> <cacheName>
#
# Copies the shared engine (css, fonts, app.js, exam.js, pwa.js), rewrites the
# app-specific identifiers, and leaves content files for the author to add.
# Idempotent: re-running refreshes the engine files but keeps content files.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/hld-lld-academy"

DIR="${1:?usage: scaffold_app.sh <dir> <AppName> <storagePrefix> <cacheName>}"
NAME="${2:?missing AppName}"
PREFIX="${3:?missing storagePrefix}"
CACHE="${4:?missing cacheName}"
DEST="$ROOT/$DIR"
LOWER="$(echo "$NAME" | tr '[:upper:]' '[:lower:]')"

mkdir -p "$DEST/css" "$DEST/fonts" "$DEST/js"

cp "$SRC"/css/*.css "$DEST/css/"
cp "$SRC"/fonts/*.woff2 "$DEST/fonts/"
cp "$SRC"/js/app.js "$SRC"/js/exam.js "$SRC"/js/pwa.js "$DEST/js/"

# ---- rewrite identifiers in the copied engine ----
# storage keys: bp_* -> <prefix>_*
perl -pi -e "s/\bbp_/${PREFIX}_/g" "$DEST/js/app.js" "$DEST/js/exam.js"
# brand strings — do the compound identifier first, since \bBlueprint\b does not
# match inside "BlueprintPractice"
perl -pi -e "s/BlueprintPractice/${NAME}Practice/g" "$DEST/js/app.js"
perl -pi -e "s/\bBlueprint\b/${NAME}/g" "$DEST/js/app.js" "$DEST/js/exam.js" "$DEST/js/pwa.js"
perl -pi -e "s/\bblueprint\b/${LOWER}/g" "$DEST/js/app.js" "$DEST/js/exam.js" "$DEST/js/pwa.js"

# Flashcards: replace Blueprint's deck with an authored-deck stub.
#
# This used to emit `var CARDS = window.ACADEMY_CARDS || []`, expecting the deck
# to arrive from a js/flashcards.js data file. Nothing ever set that global, so
# two apps shipped a flashcards view that rendered an empty deck — no exception,
# no console output, nothing any gate could see. Every mature app inlines its
# deck, so the scaffold now matches that and refuses to render an empty state:
# the stub throws when #/flashcards mounts, which the crawl gate reports as an
# exception on that exact route.
python3 - "$DEST/js/exam.js" "$NAME" <<'PY'
import sys
p, name = sys.argv[1], sys.argv[2]
s = open(p, encoding="utf-8").read()
start = s.index("  var CARDS = [")
end = s.index("\n  ];", start) + len("\n  ];")
stub = (
    "  /* Authored deck. Inline the cards here, the way every mature app does\n"
    "   * (see hld-lld-academy/js/exam.js for the shape:\n"
    "   *   { front: \"...\", back: \"...\", track: \"<trackId>\" }).\n"
    "   * Deliberately loud while empty: an empty deck renders a blank\n"
    "   * flashcards view that looks fine and no gate can see. */\n"
    "  var CARDS = [];\n"
    "  function requireDeck() {\n"
    "    if (!CARDS.length) {\n"
    "      throw new Error(\"" + name + ": the flashcard deck in js/exam.js is still the scaffold stub \" +\n"
    "        \"— inline the authored cards into CARDS before shipping #/flashcards\");\n"
    "    }\n"
    "  }"
)
s = s[:start] + stub + s[end:]

# make the stub actually fire, at mount time rather than at boot, so the rest of
# the app stays workable while the deck is being written
anchor = "  function mountFlashcards(mountEl) {\n    if (!mountEl) return;"
if anchor not in s:
    sys.exit("scaffold: mountFlashcards signature changed in the source engine; "
             "update tools/scaffold_app.sh to re-attach the deck guard")
s = s.replace(anchor, anchor + "\n    requireDeck();", 1)
open(p, "w", encoding="utf-8").write(s)
PY

echo "scaffolded $DIR ($NAME, storage ${PREFIX}_*, cache $CACHE)"
echo "  next: write index.html, sw.js (CACHE=\"$CACHE\"), manifest.webmanifest, icon.svg and content files"
echo "  then: inline the flashcard deck into js/exam.js CARDS — until you do, #/flashcards throws on purpose"
