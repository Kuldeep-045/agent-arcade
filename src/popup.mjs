// `agent-arcade popup`: opens the arcade next to the AI's terminal, using whatever the terminal supports.
//   tmux     a popup in the middle of the window
//   Ghostty  its quick terminal if it's set to open centered, otherwise a split
//   iTerm2   a split
//   Terminal a new window
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { PID } from './paths.mjs';

const osa = (script) => execFileSync('osascript', ['-e', script], { stdio: ['ignore', 'ignore', 'pipe'] });
const running = () => { try { process.kill(Number(fs.readFileSync(PID, 'utf8')), 0); return true; } catch { return false; } };

function ghosttyCentered() {
  const files = [path.join(os.homedir(), 'Library/Application Support/com.mitchellh.ghostty/config.ghostty'), path.join(os.homedir(), 'Library/Application Support/com.mitchellh.ghostty/config'), path.join(os.homedir(), '.config/ghostty/config')];
  return files.some((f) => { try { return /^quick-terminal-position\s*=\s*center/m.test(fs.readFileSync(f, 'utf8')); } catch { return false; } });
}

export function popup(cli) {
  const cmd = `${JSON.stringify(process.execPath)} ${JSON.stringify(cli)}`;
  const term = process.env.TERM_PROGRAM;

  if (process.env.TMUX) {
    spawn('tmux', ['display-popup', '-E', '-w', '70%', '-h', '70%', cmd], { detached: true, stdio: 'ignore' }).unref();
    return 'Agent Arcade popped up in the middle of this window.';
  }

  if (term === 'ghostty') {
    const focused = 'focused terminal of selected tab of front window';
    if (ghosttyCentered()) {
      if (running()) {
        osa(`tell application "Ghostty" to perform action "toggle_quick_terminal" on ${focused}`);
        return 'Agent Arcade is back (it was paused).';
      }
      // The quick terminal is the one terminal that isn't in any tab; start the arcade in it.
      osa(`tell application "Ghostty"
  perform action "toggle_quick_terminal" on ${focused}
  delay 0.6
  set inTabs to {}
  repeat with w in windows
    repeat with tb in tabs of w
      repeat with t in terminals of tb
        set end of inTabs to id of t
      end repeat
    end repeat
  end repeat
  repeat with t in terminals
    if inTabs does not contain (id of t) then
      send key "u" modifiers "control" to t
      input text ${JSON.stringify(`clear; exec ${cmd}`)} to t
      send key "enter" to t
    end if
  end repeat
end tell`);
      return 'Agent Arcade popped up in the middle of the screen. Click outside to hide it (the game pauses).';
    }
    osa(`tell application "Ghostty" to split (${focused}) direction right with configuration {command:${JSON.stringify(cmd)}}`);
    return 'Agent Arcade opened on the right side of this tab. ⌘W there closes it.';
  }

  if (term === 'iTerm.app') {
    osa(`tell application "iTerm2" to tell current session of current window to split vertically with default profile command ${JSON.stringify(cmd)}`);
    return 'Agent Arcade opened on the right side of this tab.';
  }

  if (term === 'Apple_Terminal') {
    osa(`tell application "Terminal" to do script ${JSON.stringify(`exec ${cmd}`)}`);
    return 'Agent Arcade opened in a new Terminal window.';
  }

  return 'Your terminal can\'t be split from here. Open a new tab and run: agent-arcade';
}
