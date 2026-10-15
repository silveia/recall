/* the site's colour, by request: what is black becomes a colour or a gradient. loaded in the head of
   every page (the site, the front door, the drawing app) before anything is drawn, so nothing flashes
   black first. it writes two tokens on the root:
     --tint-main  what black words and outlines become: the chosen colour, or the darker end of the
                  gradient — and if that is too light to read on white, darkened (and a touch more
                  saturated) until it is
     --tint-fill  what the big black backgrounds become (the bar, its bumps, the strip): the colour, or
                  the gradient laid over the whole window (`fixed`), so they share one layer
     --tint-grad  the same gradient sized to the box it fills, for a big box inside the page (the
                  log-in card), where a fixed one would flicker as the page slides
   everything else that was black — buttons, words, outlines — is --tint-main, solid
     --tint-layer the colour or gradient for a page that lays one layer over everything (`html.tint-layer`):
                  there black stays black underneath and the layer, blended to lighten, turns every black
                  thing into its own part of the one gradient while white stays white
   kept in localStorage 'site-tint' as { mode: 'solid' | 'gradient', solid, a, b } — solid is the one
   colour, a the gradient's bottom and b its top. the solid colour and the gradient are kept apart, so
   changing one never touches the other, and switching between them brings each back as it was left.
   nothing kept means the first colour, a solid #314444. */
(function () {
    var KEY = 'site-tint';
    var PRESETS = {
        black: { mode: 'solid', solid: '#000000' },
        makoto: { mode: 'gradient', a: '#0305b6', b: '#02cdff' }
    };
    var FIRST = { mode: 'solid', solid: '#314444', a: '#0305b6', b: '#02cdff' };

    function rgbOf(hex) {
        var h = String(hex || '').replace('#', '');
        if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
        var n = parseInt(h, 16) || 0;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function hexOf(rgb) {
        return '#' + rgb.map(function (v) {
            return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2);
        }).join('');
    }
    function lum(rgb) {
        var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    function hslOf(rgb) {
        var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
        var most = Math.max(r, g, b), least = Math.min(r, g, b), l = (most + least) / 2, h = 0, s = 0;
        if (most !== least) {
            var d = most - least;
            s = l > 0.5 ? d / (2 - most - least) : d / (most + least);
            h = most === r ? (g - b) / d + (g < b ? 6 : 0) : most === g ? (b - r) / d + 2 : (r - g) / d + 4;
            h /= 6;
        }
        return [h, s, l];
    }
    function rgbOfHsl(h, s, l) {
        if (!s) return [l * 255, l * 255, l * 255];
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        var one = function (t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        return [one(h + 1 / 3) * 255, one(h) * 255, one(h - 1 / 3) * 255];
    }
    // dark enough for words and hairlines on white (about 5:1): darkened step by step, saturated a touch
    function deepen(hex) {
        var rgb = rgbOf(hex);
        if (lum(rgb) <= 0.15) return hexOf(rgb);
        var hsl = hslOf(rgb), s = Math.min(1, hsl[1] * 1.15 + 0.05), l = hsl[2];
        for (var i = 0; i < 60 && lum(rgbOfHsl(hsl[0], s, l)) > 0.15; i += 1) l -= 0.015;
        return hexOf(rgbOfHsl(hsl[0], s, Math.max(0, l)));
    }
    // what is kept, filled out: a choice from before the two were kept apart had the solid colour in a
    var whole = function (t) {
        if (!t || typeof t !== 'object') return Object.assign({}, FIRST);
        var out = { mode: t.mode === 'gradient' ? 'gradient' : 'solid' };
        out.solid = t.solid || (out.mode === 'solid' && t.a) || FIRST.solid;
        out.a = (out.mode === 'gradient' || t.solid) && t.a ? t.a : FIRST.a;
        out.b = t.b || FIRST.b;
        return out;
    };
    function read() {
        var kept = null;
        try { kept = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (error) { kept = null; }
        return whole(kept);
    }
    function tokens(t) {
        t = whole(t);
        var a = t.mode === 'gradient' ? t.a : t.solid, b = t.mode === 'gradient' ? t.b : null;
        var darker = b ? (lum(rgbOf(a)) <= lum(rgbOf(b)) ? a : b) : a;
        return {
            main: deepen(darker),
            fill: b ? 'linear-gradient(to top, ' + a + ', ' + b + ') fixed' : a,
            grad: b ? 'linear-gradient(to top, ' + a + ', ' + b + ')' : a,
            layer: b ? 'linear-gradient(to top, ' + a + ', ' + b + ')' : a,
            top: b || a
        };
    }
    function apply(t) {
        var root = document.documentElement;
        var made = tokens(t);
        if (!made) {
            root.style.removeProperty('--tint-main');
            root.style.removeProperty('--tint-fill');
            root.style.removeProperty('--tint-grad');
            root.style.removeProperty('--tint-layer');
            root.style.removeProperty('--tint-top');
            root.classList.remove('tinted');
            return;
        }
        root.style.setProperty('--tint-main', made.main);
        root.style.setProperty('--tint-fill', made.fill);
        root.style.setProperty('--tint-grad', made.grad);
        root.style.setProperty('--tint-layer', made.layer);
        root.style.setProperty('--tint-top', made.top);
        root.classList.add('tinted');
    }
    function save(t) {
        try {
            if (t) localStorage.setItem(KEY, JSON.stringify(t));
            else localStorage.removeItem(KEY);
        } catch (error) { /* only for this visit */ }
        apply(t);
        window.dispatchEvent(new Event('site-tint'));
    }

    window.siteTint = { KEY: KEY, PRESETS: PRESETS, FIRST: FIRST, whole: whole, read: read, save: save, apply: apply, tokens: tokens };
    apply(read());
    // another page or frame of this site changed it: follow
    window.addEventListener('storage', function (event) {
        if (event.key !== KEY) return;
        apply(read());
        window.dispatchEvent(new Event('site-tint'));
    });
})();
