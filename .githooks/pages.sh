#!/bin/sh
# every section's link is the site itself, not a hop to it. github
# pages serves files, so /cards has to be a real file — and a file that
# only bounced on to app.html showed a white page and a strange address
# for a beat on every refresh. each folder gets app.html as it is, with
# a <base> so its relative paths still point at the root.
#
# run by the pre-commit hook, so the copies can never fall behind.
cd "$(git rev-parse --show-toplevel)" || exit 1
for section in home cards audio player chat; do
    mkdir -p "$section"
    # the note goes after the doctype — anything before it drops the
    # page into quirks mode
    awk 'done != 1 && /<head>/ { print; print "    <base href=\"../\">"; print "    <!-- made from app.html by .githooks/pages.sh. edit app.html, not this -->"; done = 1; next } { print }' app.html > "$section/index.html"
done
