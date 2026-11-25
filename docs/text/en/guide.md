# The guided first game

What the coach says during the guided first game (say "guided game", or finish the last lesson). ".def" lines explain a term the first time it comes up;
"tip-" lines are shown one per turn. The rest are the pieces of the coach's messages. Lines starting ** are headings.

How to edit: change the words under a "## name" heading, but leave the heading itself as it is.
Words in curly brackets, such as {point}, are filled in by the app: keep them.

## def.coord
Every point has a name, like a map reference: the letter is the column and the number is the row.

## def.liberty
A liberty is an empty point right next to a stone: above, below, left or right (never diagonal). Liberties are what keep a stone alive.

## def.capture
A stone or group with no liberties left is captured: it is taken off the board and kept as a prisoner.

## def.atari
Atari means a group has only one liberty left, so it will be captured on the next move unless it escapes.

## def.territory
Territory means the empty points that only your stones surround. At the end of the game your score is your stones plus your territory.

## def.edge
Stones on the very edge of the board (the first line) have few liberties and surround almost nothing, so they are usually weak early in the game.

## def.line
This point is on the third or fourth line from the edge, which is a good balance: close enough to the edge to be safe, far enough to claim space.

## tip-1
Tip: stones are stronger when they are connected, touching along a line. A connected group shares its liberties, so it is harder to capture.

## tip-2
Tip: corners and sides need fewer stones to surround an area than the middle does. That is why most games start near the corners.

## tip-3
Tip: before every move, look at each of your groups and count its liberties. If a group has only one, save it first.

## tip-4
Tip: you do not have to capture anything to win. Surrounding more empty points than White is enough.

## tip-5
Tip: if you are not sure where to play, type "hint". You can also ask "what is a liberty?", or type "undo" to take a move back.

## black
black

## white
white

## black-cap
Black

## white-cap
White

## and
and

## their
their

## its
its

## stone-one
1 stone

## stones
{count} stones

## liberty-one
1 liberty

## liberties
{count} liberties

## the-group
the {count}-stone group at {point}

## the-stone
the stone at {point}

## group-at
{count}-stone group at {point}

## stone-at
stone at {point}

## title
**Your first game**

## intro
This is a real game of Go, played gently. You are {you} and the computer plays {cpu} at its easiest level. {first}

## intro-handicap
This is a real game of Go, played gently. You are {you} and the computer plays {cpu} at its easiest level. Black starts with {count} stones already on the board (the handicap stones, on the star points). In Go, a stronger player gives the weaker player a head start so that the game is fair. {first}

## white-first
White moves first.

## you-first
You move first.

## how
**How to play**
1. Tap an empty point, a place where two lines cross, to put a stone there. On a phone, tap once to preview the stone and again to confirm. Stones never move once placed.
2. Your aim is to surround more empty points than your opponent (this is called territory), and to capture enemy stones that run out of liberties.
3. After every move I will explain in plain words what happened and what to look for next.
4. You can ask me anything at any time, for example "what is a liberty?", or type "hint" for a suggested move, or "undo" to take a move back.
5. When you cannot find a useful move, press Pass. When both players pass, the game ends and we count the points.

## your-move
**Your move: {point}**

## placed
You placed a {colour} stone at {point}.

## captured
You captured {stones}!

## prisoners
They are now your prisoners.

## group-libs
Your group now has {libs}.

## stone-libs
Your stone has {libs}.

## self-atari-group
Careful: that leaves the group with a single liberty, at {point}. That is atari, and White could capture it by playing there.

## self-atari-stone
Careful: that leaves the stone with a single liberty, at {point}. That is atari, and White could capture it by playing there.

## enemy-atari
{player}'s {what} is now in atari: it has only one liberty left, at {point}. If White does not rescue it, you can capture it by playing at {point}.

## cpu-move
**{player}'s move: {point}**

## cpu-placed
The computer ({player}) placed a stone at {point}.

## cpu-captured
It captured {stones} of yours.

## dont-worry
Do not worry: losing a stone is part of learning. Look at how it happened, so you can avoid it next time.

## touches
It touches {list}, which takes away one of {their} liberties.

## your-turn
**Your turn**

## warning
Warning: {what} is in atari. It has only one liberty, at {point}, so White will capture it next move unless you rescue it.

## rescue-how
To rescue it, play at {point} yourself: that adds a stone to the group and gives it new liberties. The other way is to capture one of the white stones that are attacking it.

## chance
Chance: {what} (White) is in atari. If you play at {point}, you capture it.

## how-first
Tap an empty point to place your stone. Not sure where? Type "hint".

## how-again
Look for a good empty point, or type "hint".

## you-passed
**You passed**
Passing means skipping your turn because you think there is nothing useful left to play. If White passes straight after, the game ends and we count.

## white-passes
**White passes**
The computer thinks nothing useful is left to play. If you also pass now, the game ends. If you can still gain something, keep playing.

## over
**The game is over**
Both players passed in a row, so we count. I have marked the stones I think are dead (stones that could not survive); they are taken off the board before counting. Tap a group to change my mind.
Each side scores its stones plus its territory. White also adds komi ({komi} points), a bonus for moving second, so a tie is impossible. Press Confirm result when you agree with the marks.
