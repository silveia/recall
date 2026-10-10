#!/bin/sh
# every section's link is the site itself, not a hop to it. github
# pages serves files, so /cards has to be a real file — and a file that
# only bounced on to app.html showed a white page and a strange address
# for a beat on every refresh. each folder gets app.html as it is, with
# a <base> so its relative paths still point at the root.
#
# run by the pre-commit hook, so the copies can never fall behind.
cd "$(git rev-parse --show-toplevel)" || exit 1
# github pages lets a browser keep script.js and style.css for ten minutes,
# so a push could run yesterday's script under today's page (that is how
# a chat reset still showed the old accounts). each copy names the files
# with a fingerprint of their contents, so a change is always fetched new.
mark() { shasum "$1" | cut -c1-10; }
js=$(mark script.js)
css=$(mark style.css)
for section in home cards audio chat; do
    mkdir -p "$section"
    # the note goes after the doctype — anything before it drops the
    # page into quirks mode
    awk 'done != 1 && /<head>/ { print; print "    <base href=\"../\">"; print "    <!-- made from app.html by .githooks/pages.sh. edit app.html, not this -->"; done = 1; next } { print }' app.html \
        | sed -e "s|src=\"script.js\"|src=\"script.js?v=$js\"|" -e "s|href=\"style.css\"|href=\"style.css?v=$css\"|" > "$section/index.html"
done
