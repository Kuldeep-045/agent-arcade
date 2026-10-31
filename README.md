# agent-arcade

Small terminal games to play while your AI coding agent works.
When the agent finishes, or needs your approval, the game pauses, beeps and shows a banner, so you get back to work right away.

Works with **Claude Code** and **Codex** out of the box, and with any other agent that can run a command when it's done.

```
 SNAKE   score 12   best 31
┌────────────────────────────────────────────────┐
│                                                │
│              Your AI is done!                  │
│        q: back to work   c: keep playing       │
│                                                │
└────────────────────────────────────────────────┘
```

## Install

```sh
npm install -g agent-arcade
agent-arcade setup
```

`setup` connects Claude Code (a "finished" hook, a "waiting for you" hook, and a `/arcade` command) and Codex (`notify` in `~/.codex/config.toml`).
It backs each file up first and never touches hooks it didn't add. Undo it all with `agent-arcade setup --uninstall`.

## Play

| | |
|---|---|
| `agent-arcade` | open the menu |
| `agent-arcade snake` | jump straight into a game |
| `/arcade` in Claude Code | open the arcade beside the chat |

`/arcade` opens it next to your agent: a centered popup in tmux, a split in Ghostty and iTerm2, a new window in Terminal.
In Ghostty, set `quick-terminal-position = center` and the arcade opens as a popup in the middle of the screen; click outside to hide it (the game pauses).

In a game, **Esc** pauses; from there **r** restarts, **m** goes to the menu, **q** quits. The game also pauses when you click away.

## Other agents

Have your agent run this when it finishes:

```sh
agent-arcade notify        # "your AI is done"
agent-arcade notify ask    # "your AI needs your input"
```

## Games

- **Snake**: eat, grow, avoid the walls.
- **Type racer**: code words (`async`, `git rebase`, `useEffect`…) fall down; type each one before it lands.

More are coming. Each game is one file in `src/games/`; see `src/games/index.mjs` for the interface. The shell handles the menu, banners, pausing and best scores.

## Privacy

Nothing leaves your computer. Best scores are kept in `~/.agent-arcade`.

## License

MIT
