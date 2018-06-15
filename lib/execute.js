const config = require('./config')
    , log = require('./log')
    , chokidar = require('chokidar')
    , childProcess = require('child_process')

module.exports = function() {

  config.execute.forEach(execute)
  config.execute.filter(s => s.watch).forEach((s, i) => {
    chokidar.watch(s.watch, {
      ignoreInitial: true
    }).on('add', () => changed(s, i)).on('change', () => changed(s, i))
  })

}

function changed(obj, i) {
  execute(obj, i)
}

function prepare(cmd) {
  // Replace unix path space escapes (\ ) with a temp placeholder
  cmd = cmd.replace(/\\ /g, ':::')

  // Split by whitespace, preserving quoted strings (single or double)
  cmd = cmd.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g)

  // Replace the temp placeholder with a space and eliminate the quotes
  cmd = cmd.map(arg => arg.replace(/:::/g, ' ').replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1'))

  return cmd
}

function execute(obj, i) {
  if (typeof obj.command === 'function')
    return obj.command()

  log.debug('Spawning', obj.command)

  if (obj.process) {
    log.debug('Exiting', obj.command)
    obj.process.kill()
  }

  const cmd = prepare(obj.command)

  obj.process = childProcess.spawn(cmd.shift(), cmd, {
    shell: process.platform === 'win32'
  })
  obj.process.on('error', log.error)
  obj.process.stdout.on('data', b => log('PS' + (i + 1), b.toString().replace(/\n$/, '')))
  obj.process.stderr.on('data', b => log.error('PS' + (i + 1), b.toString().replace(/\n$/, '')))
}

process.on('exit', () => {
  (config.execute || []).filter(s => s.process).forEach(s => s.process.kill())
})
