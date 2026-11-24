# Teach me

The guided teaching (say "teach me"): steps, each with one or more scenes. Names are step.scene.part, so "space.2.text" is
the explanation in the second scene of the step "A game about space". Parts: ".text" (one paragraph per blank line), ".goal" (the task),
".praise" (extra praise for a strong point), ".after", ".ok" (task solved), ".wrong", ".hint", ".ko-note" and ".more" (said when the learner asks for more).
Scenes that end by inviting the learner to go on show the text under "next" after their own text.

How to edit: change the words under a "## name" heading, but leave the heading itself as it is.
Words in curly brackets, such as {libs}, are filled in by the app: keep them.

## next
Say "next" when you are ready, or ask me anything.

## space.title
A game about space

## space.1.text
Welcome to Go. Picture the board as a field and the stones as fence posts.

Two players, Black and White, take turns placing one stone on a crossing of the lines. Stones never move once they are placed. The aim is to fence in more of the field than your opponent. The empty points you fence in are your territory.

Capturing enemy stones can help you, but it is a tool, not the aim. Go is a game about space.

## space.1.goal
Place your first stone anywhere you like.

## space.1.praise
The dotted points are the classic places to start on a 9×9 board.

## space.1.after
Notice what your stone does: it starts to claim the space around it. Tap more points to see what each would do, and say "undo" to take a stone back.

## space.1.hint
There is no wrong answer. Tap any crossing.

## space.1.more
Why a 9×9 board? Everything works the same on bigger boards, but a small board lets you see the whole fight at once, and a game takes minutes instead of hours. Black always moves first. Because that is an advantage, White receives a few points of compensation at the end, called komi. We meet it when we count.

## space.2.text
Here is a position after four moves, one stone in each corner. The shading shows who is closer to each empty point: dark squares lean towards Black, light squares towards White. Bigger squares mean a stronger lean.

Every move in Go is a small fight over who will end up owning the empty space. Place a stone where you think it would gain the most room, and watch the shading change.

## space.2.goal
Place a stone and watch how the shading changes.

## space.2.after
See how the shading moved towards Black around your stone? Say "undo" and try a different point to compare.

## space.2.hint
Try the middle of the board, then undo and try the edge.

## space.2.more
The shading is a simple picture, not a score: it only measures distance to the nearest stone. It does show the idea behind the game. A stone is most useful where it reaches a lot of empty space that the opponent cannot reach first.

## liberties.title
How stones breathe

## liberties.1.text
A stone breathes through the empty points directly beside it: above, below, left and right. Diagonal points do not count. These points are called liberties, and the green dots show them.

A stone in the middle has 4 liberties, a stone on an edge has 3, and a stone in a corner has only 2. That is why corners and edges are easier to fence in. Tap any stone to count its liberties.

## liberties.1.more
Liberties are simply room to breathe. A stone or group with no liberties is captured, which we see in a moment. Always count lines touching a stone: in the middle four touch it, on the edge three, in the corner two.

## liberties.2.text
Now make a pair. Place a second black stone directly beside the one in the middle.

## liberties.2.goal
Add a stone directly beside the one in the middle.

## liberties.2.ok
Connected! Stones that touch along a line form one group and share their liberties. This group now has {libs} liberties: count the green dots.

## liberties.2.wrong
That stone only touches the first at a corner, so the two are not connected: each keeps its own liberties. Try a point directly beside it.

## liberties.2.hint
Look at the blue ring.

## liberties.2.more
A group lives or dies together. The more liberties a group has, the safer it is, and connected stones are stronger than separate ones because they share their breathing space.

## capture.title
Fencing in a stone

## capture.1.text
You can win space by taking stones away. A stone is captured when its last liberty is filled, and it comes off the board.

The white stone has just one liberty left: the red dot at E6. A stone in this state is in atari, which means about to be captured.

## capture.1.goal
Capture the white stone by filling its last liberty.

## capture.1.ok
Captured {cap}. Look: the point is empty again, and it is now part of your space.

## capture.1.wrong
Not that one. The white stone can only be captured by filling its last liberty (the red dot).

## capture.1.hint
The red dot is the last liberty.

## capture.1.more
Capturing helps in two ways: it removes an enemy stone, and it opens up empty space that you can claim. Beginners often chase captures and forget the space. Games are won by points of territory, so capture when it helps you fence in more.

## capture.2.text
Stones that touch form a group, and a group is captured all at once when its last liberty goes. These two white stones share just one liberty. Can you find it?

## capture.2.goal
Capture both white stones.

## capture.2.ok
Both stones came off together: {cap}. A bigger group is harder to capture because it usually has more liberties.

## capture.2.wrong
Not quite. Find the single empty point that touches the white stones.

## capture.2.hint
Check the dots: only one point is left.

## capture.2.more
Edges and corners help the attacker. On the edge a stone has only 3 liberties and in the corner only 2, so fewer stones are needed to capture it.

## escape.title
Danger and safety

## escape.1.text
Now it is your stone that is in trouble. It has one liberty left, at E6, and White threatens to capture it on the next move.

You can save it by extending: add a stone on its last liberty so the group gets more room to breathe.

## escape.1.goal
Save your stone by extending.

## escape.1.ok
Saved! Your two stones now form a group with {libs} liberties, so they are no longer in atari. Extending only works when the new stone brings new liberties, so always count.

## escape.1.wrong
Not enough: your stone still has only one liberty, so White can capture it. Add a stone on its last liberty.

## escape.1.hint
The ring shows where.

## escape.1.more
Running away works only when your group gains liberties faster than the opponent can take them away. If every route is closed the group is lost, and sometimes it is wiser to give up a small group and use your move elsewhere.

## escape.2.text
Stones that touch only at a corner are not connected. The two points between them, A and B, are cutting points: if White takes one, your stones are split into two weaker pieces.

A good habit for beginners: keep your stones connected. Connect these two.

## escape.2.goal
Connect the two black stones.

## escape.2.ok
Connected. Whoever plays on a cutting point first decides whether two stones are one group or two.

## escape.2.wrong
Those two stones still touch only at a corner. A white stone on A or B would split them. Play on one of those two points.

## escape.2.hint
Either A or B works.

## escape.2.more
Connected stones share liberties and support each other, so they are hard to attack. Cut stones must each look after themselves, and weak stones cost you moves to defend.

## territory.title
Counting your space

## territory.1.text
Now the real aim. Black has fenced in the left side and White the right. The shaded squares are territory: empty points enclosed by one colour only.

The column between the two walls touches both colours, so it belongs to nobody. Players fill such points in at the end.

## territory.1.more
Territory counts only if the empty region touches stones of one colour. On a real board the fences are rarely this tidy: the fight is about where the fences go.

## territory.2.text
In our scoring, your score is your stones plus your territory. Black has 9 stones on the wall and 27 shaded points.

## territory.2.goal
What is Black's score?

## territory.2.ok
36, correct. White also has 9 + 27 = 36. Moving first is an advantage, so White receives a bonus called komi (6.5 points here), giving White 42.5. White wins by 6.5. Every point of space matters.

## territory.2.wrong
Count again: 9 stones on the wall plus 27 shaded points. Say "show me" if you want the answer.

## territory.2.hint
Add the 9 stones to the 27 shaded points.

## territory.2.more
Counting stones plus territory is called area scoring. It is simple: just count everything each player controls.

## territory.3.text
When neither player can gain anything more, you pass. If both players pass in a row, the game is over and you count.

At the end, stones that could not survive are removed first. In this app I will mark the ones I think are dead, and you can correct me by tapping them.

## territory.3.more
Beginners often wonder when to stop. Stop when every boundary is settled: no move would add space to you or take space from your opponent.

## start.title
Where to start

## start.1.text
Where should the first stones go? Compare the cost of fencing in the same amount of land. Here four stones fence in four points in the corner (shaded).

The corner is cheap because two edges of the board do part of the fencing for free.

## start.1.more
A stone in the corner needs far fewer friends to wall off territory than a stone in the middle, because the edges are already doing some of the work.

## start.2.text
The same four points on the edge need six stones, because only one edge helps.

## start.2.more
On a side, only one edge works for you. So sides come after corners.

## start.3.text
In the middle, the same four points need eight stones. So at the start of a game, the usual order is corners first, then sides, then the centre.

On a small 9×9 board the centre point is still a strong move, because one central stone can reach everywhere. But corners first is a good habit.

## start.3.more
On bigger boards the centre matters even more later in the game, but at the start it is the most expensive place to build land.

## start.4.text
Your turn. Place a first stone where you think it claims space most efficiently.

## start.4.goal
Place a stone where you think it claims space most efficiently.

## start.4.praise
Exactly the kind of point strong players choose on a 9×9 board.

## start.4.after
Tap other points to compare what each would do, and say "undo" to take a stone back.

## start.4.hint
Try a point on the third line, near a corner: C3, G3, C7 or G7.

## start.4.more
On 9×9 the dotted points are the usual choices. The third line from an edge balances land and safety.

## eyes.title
Staying alive: two eyes

## eyes.1.text
Territory is only yours if you can keep it: White may try to move in and capture your group. The defence is simple. A group is safe if it has two separate eyes, meaning two empty points inside it that White can never fill.

Black already has one eye, at the corner. Make a second one.

## eyes.1.goal
Make a second eye.

## eyes.1.ok
Two eyes! The points A1 and C1 are both completely surrounded by Black stones. White cannot play on either, because the stone would have no liberties, so this group can never be captured: it is alive. It is now White's turn: tap A1 or C1 and see what the board says.

## eyes.1.wrong
Not quite: that does not give a second separate eye. Look at the empty points along the edge; one move splits the space into two single-point eyes.

## eyes.1.hint
Look at the point marked A.

## eyes.1.more
Why one eye is not enough: White fills all the outside liberties and then plays inside the eye, which is legal because it captures. With two separate eyes, each one is suicide for White, so the group lives. This is called life, and it is the main reason to keep your stones together.

## rules.title
Two forbidden moves

## rules.1.text
Go has only two rules about forbidden moves. The first: you may not play a stone that would have no liberties, unless it captures something.

White has surrounded point A completely. Try playing a black stone there.

## rules.1.goal
Try to play a black stone at A.

## rules.1.ok
The board refused. A black stone at A would have no liberties, and it would capture nothing because every white stone still has liberties of its own. That is suicide, and it is not allowed. (If the stone captured something, the freed points would give it liberties and the move would be fine.)

## rules.1.wrong
That is a legal move, but not the one I meant. Tap A (the lettered point).

## rules.1.hint
Tap the point marked A.

## rules.1.more
The suicide rule protects eyes: White cannot fill an eye that has only one point unless doing so captures.

## rules.2.text
The second rule is ko. White's stone at D5 has one liberty, at E5. Capture it.

## rules.2.goal
Capture the white stone at D5.

## rules.2.ok
Captured. Now look at your stone at E5: its only liberty is D5. If White could retake there at once, the board would return to the earlier position and the game could repeat for ever. So White may not retake straight away. Try it: tap D5 as White.

## rules.2.wrong
Not that one. The white stone at D5 has one liberty at E5.

## rules.2.hint
The white stone D5 is in atari; fill its last liberty.

## rules.2.ko-note
White must play somewhere else first, ideally a move that threatens something bigger. If Black ignores the threat, White can then retake. A fight like this is called a ko.

## rules.2.more
The ko rule only stops the same position from repeating. Because each player can make a threat elsewhere, ko fights are a battle of who has more threats.

## play.title
Your first game

## play.1.text
That is the whole foundation: aim at space, count liberties, capture to open space, stay connected, make two eyes, and avoid the two forbidden moves.

The best way to learn the rest is to play. I suggest a game on this 9×9 board with a head start of five stones, against the easy computer, with Coach mode on so I can comment as we go. Say "play" to begin, or ask me anything first.

## play.1.more
A head start is not a handicap: five extra stones for Black make the first games forgiving, and you can reduce them as you improve. You can ask me to teach again at any time.
