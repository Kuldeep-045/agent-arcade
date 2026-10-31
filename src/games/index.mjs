// Every game in the arcade. To add one, write a file in this folder and list it here.
//
// A game is an object:
//   id, name, blurb     id for scores and `agent-arcade <id>`; name and a short line for the menu
//   help                controls shown under the board, e.g. 'arrows move'
//   better, unit        'higher' (default) or 'lower' score wins; unit appended to scores, e.g. 'ms'
//   start()             returns a fresh state
//   tick(state, now)    advances one step and returns ms until the next tick; set state.over = true to end
//   key(state, key)     key is 'up' 'down' 'left' 'right' 'enter' 'backspace' or a character
//                       (Esc, Ctrl-C and focus changes are handled by the shell)
//   draw(state)         returns the board as rows of text (ANSI colours allowed)
//   score(state)        the current score
//   status(state)       optional extra text for the header, e.g. lives
import snake from './snake.mjs';
import typer from './typer.mjs';

export default [snake, typer];
