const stringToStream = require('string-to-stream')
const getServerPort = require('get-server-port')
const serverRouter = require('server-router')
const browserify = require('browserify')
const resolve = require('resolve')
const xtend = require('xtend')
const http = require('http')
const path = require('path')
const opn = require('opn')

const defaults = {
  port: 1337,
  browse: false,
  optimize: false,
  entry: '.',
  html: {},
  css: {},
  js: {}
}

const cwd = process.cwd()

module.exports = start

// Start a development server
// (obj, fn) -> null
function start (options, cb) {
  const bankai = require('../')({
    optimize: options.optimize
  })

  const opts = xtend({}, defaults, options)
  const callback = cb || function () {}

  const entryFile = resolveEntryFile(opts.entry)
  const relativeEntry = path.relative(cwd, entryFile)

  const routes = []

  routes.push(['/404', (req, res) => {
    res.statusCode = 404
    return stringToStream('Not found')
  }])

  if (opts.html) {
    const html = bankai.html(opts.html)
    routes.push(['/', html])
    routes.push(['/:path', html])
  }

  if (opts.css) {
    const css = bankai.css(opts.css)
    const route = opts.html.css || '/bundle.css'
    routes.push([route, css])
  }

  if (opts.js) {
    const js = bankai.js(browserify, entryFile, opts.js)
    const route = opts.html.entry || '/bundle.js'
    routes.push([route, js])
  }

  const router = serverRouter('/404', routes)
  const server = http.createServer((req, res) => router(req, res).pipe(res))

  server.listen(opts.port, () => {
    const port = getServerPort(server)

    const address = ['http://localhost', port].join(':')
    console.log('Started bankai for', relativeEntry, 'on', address)

    if (opts.browse || typeof opts.open === 'string') {
      const app = typeof opts.open === 'string' ? opts.open : null

      const appName = (typeof opts.open === 'string' && opts.open !== '')
        ? opts.open
        : 'system browser'
      console.log('Opening', address, 'with', appName)

      opn(address, {app: app})
        .catch(error => {
          console.error(error)
        })
    }

    callback()
  })
}

// resolve a path according to require.resolve algorithm
// string -> string
function resolveEntryFile (relativePath) {
  const first = relativePath.charAt(0)
  const entry = ['.', '/'].includes(first) ? relativePath : './' + relativePath
  return resolve.sync(entry, {basedir: cwd})
}
