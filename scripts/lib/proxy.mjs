export function proxyTable(tools) {
  return Object.fromEntries(tools.map(t => {
    const segment = t.path.replaceAll('/', '')
    return [`^/${segment}(/.*)?$`, { target: `http://127.0.0.1:${t.devPort}`, ws: true }]
  }))
}
