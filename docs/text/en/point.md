# A point on the board

What the coach says about one point ("what about D4?"), and its report on groups short of liberties ("am I in danger?").
These sentences are put together from pieces, so each piece is short.

How to edit: change the words under a "## name" heading, but leave the heading itself as it is.
Words in curly brackets are filled in by the app: keep them. {point} is a point such as D4, {count} a number,
{colour} the word under "black" or "white" below.

## black
black

## white
white

## stone
stone

## group
group

## liberty
liberty

## liberties
liberties

## and
and

## occupied
{point} is already occupied by a {colour} stone.

## ko
{point} is illegal right now: it would retake a ko immediately. Play elsewhere first.

## suicide-why
the {colour} {what} next to it still has {count} {liberties} left ({list})

## suicide-why-many
each neighbouring stone or group still has a liberty elsewhere

## suicide
{point} is illegal for {colour}: the stone would have no liberties, because every point beside it is already occupied. It captures nothing, because {reason}. A move with no liberties that captures nothing is suicide, so the game refuses it.

## suicide-plain
{point} is illegal for {colour}: the stone would have no liberties, because every point beside it is already occupied. It captures nothing. A move with no liberties that captures nothing is suicide, so the game refuses it.

## not-legal
{point} is not a legal move.

## legal
{point} is legal. {details}.

## captures-one
it captures 1 stone

## captures-many
it captures {count} stones

## self-atari
it leaves your stone with one liberty (self-atari), so it can be captured at once

## group-libs
the group there would have {count} liberties

## puts-atari
it puts the {count}-stone enemy group at {point} in atari

## rescues
it rescues your group at {point} from atari

## first-line
it is on the first line, which is usually too low early on

## third-line
it is on the 3rd line, a good balance of territory and safety

## fourth-line
it is on the 4th line, a good balance of territory and safety

## weak-none
No group is short of liberties right now, so nothing is in immediate danger.

## weak-atari
• {who} {size} at {point} is in atari: its last liberty is {last}.

## weak-two
• {who} {size} at {point} has 2 liberties.

## weak-yours
Your

## weak-computers
The computer's

## weak-size-group
{count}-stone group

## weak-size-stone
stone

## weak-save
Save your group by extending it, or by capturing a neighbouring enemy stone.

## weak-capture
You can capture the group in atari by playing its last liberty.
