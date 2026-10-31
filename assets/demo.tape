# The README demo. Record it with:  vhs assets/demo.tape   (from the repo root; needs vhs and agent-arcade on PATH)
# It plays Snake for a few seconds, then "your AI finishes" and the banner pops up.
Output assets/demo.gif

Set Shell zsh
Set FontSize 18
Set Width 1000
Set Height 640
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 70ms
Set CursorBlink false

# A fresh home so the demo starts with no best scores, seed 11 so the food lands where the moves below
# go (the snake eats 4), and the AI "finishes" just after the fourth bite.
Hide
Type "export HOME=$(mktemp -d) PS1='%F{cyan}$%f ' && setopt nomonitor && export AGENT_ARCADE_SEED=11 && (sleep 11.9; agent-arcade notify done) & clear"
Enter
Sleep 500ms
Show

Type "agent-arcade"
Sleep 400ms
Enter
Sleep 1800ms

# Snake: a 3-second countdown, then the planned moves for seed 11 (each lands mid-tick).
Enter
Sleep 3700ms
Down
Sleep 134ms
Right
Sleep 792ms
Up
Sleep 130ms
Left
Sleep 2430ms
Up
Sleep 620ms
Right

# The banner is up now: let it sit, then go back to work.
Sleep 3000ms
Type "q"
Sleep 1200ms
