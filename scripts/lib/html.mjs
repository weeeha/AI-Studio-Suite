export function pillSrcFor(toolPath) {
  const depth = toolPath.split('/').filter(Boolean).length
  return '../'.repeat(depth) + '_suite/pill.js'
}

export function injectPill(html, src) {
  if (html.includes('data-suite-pill')) return html
  const tag = `<script type="module" src="${src}" data-suite-pill></script>`
  const i = html.lastIndexOf('</body>')
  return i === -1 ? html + tag : html.slice(0, i) + tag + html.slice(i)
}
