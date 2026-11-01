// Agent Arcade as a Claude Code plugin.
// - /arcade opens the arcade at once: no model turn, and it works while Claude is busy.
// - When Claude finishes a turn, or stops to ask you something, the arcade is told,
//   so a running game pauses and shows a banner.
// Uses the agent-arcade CLI when it is installed (npm i -g agent-arcade), else npx.
import type { Register, EngineInterface } from 'claude-code'

// Try the installed CLI first; fall back to npx so the plugin works with nothing else installed.
async function arcade($: EngineInterface, args: string[], timeoutMs: number) {
  try {
    return await $.process.run(['agent-arcade', ...args], { timeoutMs })
  } catch {
    return $.process.run(['npx', '--yes', 'agent-arcade@latest', ...args], { timeoutMs: timeoutMs + 60000 })
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'arcade',
      description: 'Open Agent Arcade instantly, even while Claude is working',
      immediate: true,
    })
    return next(e)
  })

  on('command.run', { command: 'arcade' }, async $ => {
    try {
      const { exitCode, stdout, stderr } = await arcade($, ['popup'], 10000)
      if (exitCode === 0) return { text: stdout.trim() || 'Agent Arcade opened.' }
      return { text: `Agent Arcade could not open: ${(stderr || stdout).trim()}` }
    } catch (err) {
      return { text: `Agent Arcade could not start (try: npm install -g agent-arcade). ${err}` }
    }
  })

  // Claude finished its turn: tell the arcade "done". Never block or change the stop.
  on('classic.Stop', async ($, e, next) => {
    arcade($, ['notify'], 5000).catch(() => {})
    return next(e)
  })

  // Claude is waiting on you (a permission prompt or an idle prompt): tell the arcade "ask".
  on('classic.Notification', async ($, e, next) => {
    arcade($, ['notify', 'ask'], 5000).catch(() => {})
    return next(e)
  })
}
