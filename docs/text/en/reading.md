# Reading the fight

What the coach says when it analyses a position where some stones are short of liberties: which stones are weak, whether your
own stones are safe, why the best move works (reading the opponent's answers), and what is wrong with the other suggestions.
Words in curly brackets are filled in by the app: {colour} is Black or White, {stones} and {libs} are points such as "D6 and E7",
{letter} is a suggestion's letter (A to E) and {point} its point.
Names ending in .1 are for a single stone, .n for several.

How to edit: change the words under a "## name" heading, but leave the heading itself as it is.

## h.weak
Weak {colour} stones

## h.mine
{colour}'s stones

## h.best
Best move

## h.also
Also good

## h.weaker
Weaker options

## and
and

## numbers
one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve

## stones.1
one stone

## stones.n
{count} stones

## atari.1
{stones} has one liberty ({libs}), so it is already in atari.

## atari.n
{stones} have one liberty ({libs}), so they are already in atari.

## two.1
{stones} has two liberties ({libs}).

## two.n
{stones} have two liberties ({libs}).

## safe.1
{stones} is safe, with {count} liberties.

## safe.n
{stones} are safe, with {count} liberties.

## safe-rest
The other {colour} stones have three or more liberties.

## solid
{colour} is solid.

## big
The big group ({stones}) has {count} liberties.

## group.1
{stones} has {count} liberties.

## group.n
The group {stones} has {count} liberties.

## thin-only.1
The only slightly thin stone is {stones}, with two liberties ({libs}).

## thin-only.n
The only slightly thin stones are {stones}, with two liberties ({libs}).

## thin.1
{stones} is slightly thin, with two liberties ({libs}).

## thin.n
{stones} are slightly thin, with two liberties ({libs}).

## in-time
{colour} cannot exploit that in time.

## mine-atari.1
{stones} is in atari: its last liberty is {libs}.

## mine-atari.n
{stones} are in atari: their last liberty is {libs}.

## best
{letter} ({point}). It {effects}.

## share
{stones} now both depend on {point}.

## eff.capture
captures {stones} at once

## eff.atari
puts {stones} in atari

## eff.cut
cuts {stones} off from {other}

## eff.cut-it
cuts it off from {other}

## eff.save
gives {stones} more liberties

## bullet
• {text}

## if
If {colour} {reply}, {outcome}

## r.connect
connects at {point}

## r.extend
extends to {point}

## r.atari
ataris {stones} at {point}

## r.capture
captures {stones} with {point}

## r.ignore
ignores it

## r.other
plays {point}

## o.capture
{colour} {point} captures {stones}.

## o.capture-still
{colour} {point} still captures {stones}.

## o.saves
{colour} {point} still captures {stones} and saves {mine}.

## o.escape
{colour} escapes.

## o.nothing-more
{colour} keeps what it has captured, but wins nothing more.

## also
{letter} ({point}) is good but smaller. It {effects}, but {colour} answers at {reply}, and {me} gains {gain} ({won}) instead of {best}.

## works-only
{letter} ({point}) works only if {colour} {reply}. {colour} can play {point2} instead, and {me} gains only {gain}.

## works-only-0
{letter} ({point}) works only if {colour} {reply}. {colour} can play {point2} instead, and {me} gains nothing.

## elsewhere
elsewhere

## escapes
{letter} ({point}) {effects}, but {colour} answers at {point2} and escapes.

## protects
{letter} ({point}) protects {stones}, which does not need it yet.

## quiet
{letter} ({point}) {effects}.

## nothing
{letter} ({point}) does not attack anything directly.

## answer
Answer: {letter} ({point}).
