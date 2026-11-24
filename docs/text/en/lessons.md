# Lessons

The step-by-step 9×9 lessons, in six chapters ("chapter.<name>": the chapter's title and one-line introduction in the lessons menu). For each lesson: its title, the explanation (".text", one paragraph per blank line), the task,
and what the coach says when the learner plays (".done" when the task is solved, the others when it is not yet).
Quiz lessons also have their answer options (".options", one per line, in the same order), ".wrong" and ".explain".

How to edit: change the words under a "## name" heading, but leave the heading itself as it is.
Words in curly brackets, such as {count}, are filled in by the app: keep them.
Do not change the order of the quiz options: the app knows which one is right by its place in the list.

## chapter.basics.title
Basic training

## chapter.basics.intro
Know your troops: how stones stand on the board, breathe and are captured.

## chapter.tactics.title
Tactics

## chapter.tactics.intro
The skirmish: threats, forbidden moves, and the two eyes that keep a group alive.

## chapter.formations.title
Formations

## chapter.formations.intro
Judging formations (shape): how stones stand together, where they can be cut, and which shapes waste stones.

## chapter.terrain.title
Reading the terrain

## chapter.terrain.intro
Mapping: who owns which ground, and when the battle is over.

## chapter.reading.title
Calculating the engagement

## chapter.reading.intro
Reading: count the moves before you fight.

## chapter.campaign.title
Developing strategies

## chapter.campaign.intro
Strategy: where to begin, and how to give or take a head start.

## reason.occupied
That point is already taken. Stones can only go on empty points.

## reason.ko
Ko: you may not retake straight away. Play somewhere else first, then you may retake.

## reason.suicide
Illegal: that stone would have no liberties and would capture nothing. This is called suicide.

## reason.illegal
Illegal move.

## board.title
Stones and the board

## board.text
Welcome to Go. You play with black and white stones on a grid of lines. This board has 9 lines across and 9 lines down.

Stones are not placed inside the squares. They go on the points where two lines cross. These crossing points are called intersections, or simply points. A 9×9 board has 81 points.

Black always plays first. After that, the players take turns, one stone each. Once a stone is on the board it never moves. The only way it leaves the board is by being captured, which you will learn soon.

## board.task
Tap any four empty points to place four stones. The colours take turns by themselves: black, white, black, white.

## board.done
Well done. You placed four stones and the colours took turns. That is how every game of Go starts. Next you will learn what keeps a stone safe: its liberties.

## board.progress
{count} of 4 stones placed. Tap another empty point.

## liberties.title
Liberties

## liberties.text
Every stone needs room to breathe. The empty points directly next to a stone are called its liberties. A liberty is the point straight above, straight below, to the left or to the right of the stone. Points touching only at a corner (diagonals) do not count.

The small green dots on the board show each stone’s liberties. Count the dots to count the liberties.

A stone in the middle of the board has 4 liberties. A stone on an edge has 3, because one side is the edge of the board. A stone in a corner has only 2.

Liberties matter because a stone with no liberties left is captured. You will see that in the next lesson.

## liberties.task
Place a Black stone that has exactly two liberties. Hint: where does the board run out on two sides at once?

## liberties.done
Yes. Count the green dots: this stone has exactly two liberties, because it sits in a corner. A corner stone has 2, an edge stone has 3 and a stone in the middle has 4.

## liberties.middle
That stone has {count} liberties (count its green dots). A stone in the middle of the board has four. Try a corner, where the board ends on two sides.

## liberties.edge
That stone has {count} liberties (count its green dots). A stone on an edge has three. Try a corner.

## capture.title
Capturing a stone

## capture.text
You capture an enemy stone by taking away its last liberty. When a stone has no liberties left, it is captured: it is removed from the board, and you keep it as a prisoner.

Look at the white stone in the middle of the board. Black stones are on three of its sides, so it has only one liberty left. The green dot shows where.

If you place a black stone on that last liberty, the white stone has nowhere left to breathe, and you capture it.

## capture.task
Capture the white stone by placing a Black stone on its last liberty (the green dot).

## capture.done
Captured. The white stone was removed and you now hold one prisoner. Capturing stones is how you win fights.

## capture.not-yet
Not yet. Place your stone on the green dot: that is the white stone’s last liberty.

## groups.title
Groups

## groups.text
Stones of the same colour that touch each other along a line (up, down, left or right) are connected. Connected stones form a group.

A group acts as one unit. Its stones share all their liberties, and if the group loses its last liberty, every stone in it is captured at the same moment.

The two white stones here touch, so they are one group. Black surrounds them on every side except one, so the group has a single liberty. Find the green dot.

## groups.task
Capture both white stones with one move.

## groups.done
Both stones were captured at once, because they were one group. You now hold two prisoners.

## groups.not-yet
The white group has one liberty left. Place your stone on the green dot.

## atari.title
Atari and escape

## atari.text
When a stone or group has only one liberty left, it is in atari. This is the Go word for “you are about to be captured”. If it is the opponent’s turn, they can capture it with their next move.

Here the black stone is in atari. White has stones on three sides. The red dot shows its last liberty (a green dot is a normal liberty, a red dot means only one is left).

You can save a stone in atari by extending: place another stone of your colour on the last liberty. The two stones join into one group, and the group gets new liberties of its own.

## atari.task
Save the black stone by extending it onto its last liberty (the red dot).

## atari.done
Saved. The two black stones are now one group with several liberties, so White cannot capture it next move.

## atari.failed
That did not help: White captures the stone next move. Press Reset and try the red dot.

## suicide.title
No suicide

## suicide.text
There is one more rule about liberties. You may not place a stone where it would have no liberties at all. This is called suicide, and the game does not allow it.

Here, the empty point marked A is surrounded by four white stones. A black stone at A would have no liberties. It would capture nothing either, because each white stone still has a liberty of its own somewhere else.

## suicide.task
Try to play Black at A, and see what the game says.

## suicide.done
Correct: the game refuses it. A stone that would have no liberties, and captures nothing, is suicide, and suicide is not allowed.

## suicide.legal
That move is legal, but try the middle point A.

## exception.title
Capture beats suicide

## exception.text
There is an exception to the suicide rule: a move that captures is always allowed.

This is the same shape as the last lesson, but now the white stone at the top has black stones on three sides, so point A is its last liberty.

If Black plays at A, the white stone loses its last liberty and is captured first. Once it is removed, your new stone has a liberty again, so the move is legal.

## exception.task
Play Black at A and capture the white stone.

## exception.done
Legal, because it captures. The captured stone is removed first, so your stone is left with a liberty. Capture comes before suicide.

## exception.not-yet
Play at A.

## ko.title
Ko

## ko.text
Sometimes two players could capture the same stone back and forth for ever. The ko rule stops this: you may not make a move that brings the board back to exactly how it was after your opponent’s last move. (“Ko” is Japanese for “eternity”.)

Here Black can capture the white stone by playing at A. But then White could capture Black’s new stone straight back by playing at B, and Black could take it again, and so on for ever.

So after a ko capture, the other player must play somewhere else first. Only after a move elsewhere may they retake.

## ko.task
First play Black at A to capture. Then it is White’s turn: try to retake at B and see what happens.

## ko.done
That is ko. White is not allowed to retake at once and must play somewhere else first, ideally a move that Black has to answer.

## ko.captured
Captured. Now it is White’s turn: try to retake at B straight away.

## ko.elsewhere
Try the marked point.

## eyes.title
Two eyes

## eyes.text
An eye is an empty point that is completely surrounded by your own stones. Eyes are what make a group safe.

Here is why. To capture a group, the opponent has to fill all of its liberties. But a stone placed in an eye has no liberties of its own, so it is suicide, unless it captures. A group with two separate eyes can therefore never be captured: the opponent cannot fill either eye while the other one is still there.

This black group in the corner has two eyes, the empty points A and B. We say a group with two eyes is alive. A group that cannot make two eyes is in danger, and a group that will be captured is called dead.

## eyes.task
You play White. Try to place a stone at A, and then at B.

## eyes.done
Neither eye can be filled. This group has two eyes, so it is alive and can never be captured.

## eyes.refused
Refused: that stone would have no liberties. Now try the other eye.

## eyes.legal
That is legal, but try the eyes at A and B.

## connect.title
Connecting stones

## connect.text
Your stones are connected when they touch along a line: up, down, left or right. Stones that touch only at a corner (diagonally) are not connected.

Connection matters because connected stones form one strong group that shares its liberties. Stones that are not connected can be separated by your opponent.

The two black stones here touch only at a corner. White has stones waiting nearby to push in between them, at A or at B.

## connect.task
Connect the two black stones by playing at A or at B.

## connect.done
Connected. The two stones now touch along a line, so they are one group and share their liberties.

## connect.not-yet
Not connected yet: the stones still meet only at a corner. Play at A or B.

## cut.title
Cutting

## cut.text
The opposite of connecting is cutting. When two enemy stones touch only at a corner, you can place a stone on one of the two points between them. That separates them.

It is White’s turn in the same position. The black stones touch only at a corner, so A and B are cutting points.

After a cut, Black has to spend a move to reconnect at the other point, and separated stones are easier to attack than one strong group.

## cut.task
You play White. Cut the two black stones apart by playing at A or at B.

## cut.not-yet
Those stones are still joined. Play at A or B.

## cut.done
Cut. Black must now spend a move to reconnect at the other point, and a divided group is weaker.

## tiger.title
The tiger’s mouth

## tiger.text
Formations matter as much as single stones. Here two black stones stand one point apart, and White is approaching from below. White would like to push in at B and split them.

You could fill B yourself: a solid connection. It is safe, but it uses a stone on a point that claims nothing new.

The stronger formation is the tiger’s mouth: play at A. Now three black stones surround B like an open mouth. If White pushes in at B, that stone has only one liberty, and you capture it with your next move. The two stones are as good as connected, and A also reaches out to claim more ground.

## tiger.task
Make a tiger’s mouth by playing at A.

## tiger.done
A tiger’s mouth. A white stone pushed in at B would be captured at once, so your stones are safe, and your formation covers more ground than a solid connection. As Edward Lasker wrote in Go and Go-Moku: “A premature tightening of the connection between the members of a chain is evidently a waste of time which the opponent can utilize to his advantage.” Turn on Shapes in Coach mode and I will point these out in your own games.

## tiger.solid
That connects solidly: safe, but slower, because the stone at B claims nothing new. Press Reset and try A.

## tiger.not-yet
That leaves B open for White to split your stones. Press Reset and try A.

## triangle.title
Bad shape: the empty triangle

## triangle.text
Some formations waste stones. The best-known is the empty triangle: three stones in an L, with the fourth corner of the little square left empty.

Three stones in an empty triangle have fewer liberties than three stones spread out, and they claim less ground. You have spent three stones doing the work of two. Strong players avoid it unless nothing better exists.

## triangle.task
Black has two stones side by side. Which of the marked moves would make an empty triangle?

## triangle.options
A
B
C

## triangle.wrong
Not quite. Look for the move that makes an L of three stones with the fourth corner of the square empty.

## triangle.explain
A makes an empty triangle: three stones in an L, bunched together. B reaches out diagonally and C jumps one point: both claim more ground with the same stone. Turn on Shapes in Coach mode and empty triangles are marked in red.

## scoring.title
Counting the score

## scoring.text
When the game ends, we count to see who has more. We use area scoring: your score is the number of your stones on the board, plus the number of empty points that only your stones surround. Those empty points are called your territory.

White also receives a bonus called komi (usually 6.5 or 7.5 points). Black moves first, which is an advantage, and komi makes up for it. The half point means there are no ties.

In this picture a black wall encloses the empty points on its left, and a white wall encloses the empty points on its right. Ignore komi for this question.

## scoring.task
Count stones plus territory for each side. Who is ahead, ignoring komi?

## scoring.options
Black by 9
White by 9
White by 18
A tie

## scoring.wrong
Not quite. Count each side’s stones, then the empty points that only that side surrounds, and add the two numbers.

## scoring.explain
Black: 9 stones + 27 empty points = 36. White: 9 stones + 36 empty points = 45. White is ahead by 9 before komi.

## border.title
Sealing the border

## border.text
Territory only counts when it is sealed. Here Black has built a wall down the board, and White has a wall of its own. But Black’s wall has a gap.

Through the gap, the empty points on Black’s side join up with the empty column between the two walls, and that column touches White’s stones too. Ground that touches both colours belongs to nobody, so at the moment none of Black’s side counts as Black’s territory, and White could walk in.

## border.task
Seal the gap so that Black’s side becomes Black’s territory.

## border.done
Sealed. Every empty point on Black’s side now touches only black stones, so it all counts as Black’s territory. One stone in the right place turned a whole area into points.

## border.not-yet
Black’s side still leaks through the gap. Press Reset and close the gap in the wall.

## dame.title
Neutral points

## dame.text
When two walls face each other with a gap between them, the empty points in the gap touch both colours. In area scoring, an empty point counts only for a side that surrounds it alone, so these points count for nobody. They are called neutral points, or dame (say “dah-meh”).

Here a black wall and a white wall face each other across one empty column.

## dame.task
When the game is counted, whose point is A?

## dame.options
Black’s
White’s
Nobody’s: it is a neutral point

## dame.wrong
Not quite. Look at what A touches: which colours are next to it?

## dame.explain
A touches a black stone on one side and a white stone on the other, so it counts for nobody. B, on Black’s side, touches only black stones, so it is Black’s territory. Before you pass at the end of a game, fill the neutral points: in area scoring, a stone on a neutral point is one more point for you.

## ending.title
Ending the game

## ending.text
A player may pass instead of placing a stone. Passing means “I have nothing useful left to play.” When both players pass one after the other, the game is over.

Before counting, stones that could not possibly survive (dead stones) are taken off the board. Then each side scores its stones plus the empty points that only it surrounds.

## ending.task
What happens after two passes in a row?

## ending.options
The game ends and is scored
Black must play again
The game starts again
White wins automatically

## ending.wrong
Not quite. Think about what passing means: there is nothing useful left to play.

## ending.explain
Two passes in a row end the game. Dead stones come off the board, then both sides count their stones plus their territory.

## race.title
Counting before you fight: the capturing race

## race.text
Reading means working out a fight before you start it. The simplest case is the capturing race: two groups are trapped next to each other, and neither can escape or make two eyes. Each side fills the other’s liberties, one per move, and the first to fill them all captures.

In the top-left corner, two black stones and two white stones are locked together. Each pair is walled in by the other side’s strong stones. The points marked B are the black pair’s liberties, and the points marked W are the white pair’s: two each.

It is Black’s turn.

## race.task
Count the liberties. Who wins the race?

## race.options
Black, because Black moves first
White
Neither: both groups live

## race.wrong
Not quite. Play it out in your head: each move fills one liberty. Who runs out first?

## race.explain
Black fills one of White’s two liberties, White fills one of Black’s, and Black fills White’s last liberty and captures. With equal liberties, the side that moves first wins the race. So count before you fight: one liberty, or one move, decides it.

## ladder.title
The ladder: read it to the end

## ladder.text
A ladder is a chase. Black plays at A: atari. White runs, Black gives atari again from the other side, and the chase zig-zags across the board like the steps of a ladder. If nothing stops it, the white stones run into the edge and are captured.

But a ladder can only be judged by reading it to the end. Here a white stone, marked X, stands on the path the ladder will take.

## ladder.task
Black plays at A and keeps giving atari. Does the ladder capture White?

## ladder.options
Yes: a ladder always captures in the end
No: the stone at X lets White escape

## ladder.wrong
Not quite. Follow the chase in your head, one step at a time, all the way to the stone at X.

## ladder.explain
When the running stones reach X, they join it and gain liberties, so the chase fails, and Black is left with a line of weak stones that White can now attack. A stone like X is called a ladder breaker. Without it, this ladder would run into the edge and capture. Read every ladder to the end before you start it.

## net.title
The net

## net.text
Sometimes the direct attack fails. The white stone in the middle has two liberties. If you give atari on either one, it simply runs out of the other side and escapes.

The answer is a net: a move that does not touch the stone, but stands on its escape route. Whichever way White runs, Black can then close the net and capture. This is why reading matters: the strongest move is often not the most obvious one.

## net.task
Capture the white stone with a net. Do not give atari: find the move that blocks its escape.

## net.done
A net. White cannot get out: if it runs to either side, Black closes the net with atari and captures. You read past the obvious atari to the move that really works.

## net.atari
That is atari, and White escapes through the other liberty. Press Reset and look for a move that blocks the escape route without touching the stone.

## net.not-yet
White can still run out. Press Reset and look one point further along the escape route.

## handicap.title
Handicap and komi

## handicap.text
When two players are not equally strong, the weaker player takes Black and receives a head start: extra black stones are placed on the board before the game begins. This is called a handicap. Two handicap stones are shown here, on two opposite star points (the small dots printed on the board).

With a handicap, White plays first. Komi, White’s bonus for moving second, drops to half a point, because Black already has a head start.

You can choose 2 to 5 handicap stones when you start a new game.

## strategy.title
First ideas

## strategy.text
Here are a few first ideas. Corners come first: a corner stone is protected by two edges of the board, so it takes the fewest stones to claim an area there. Sides come next, and the centre last.

Keep your stones connected, and look for chances to cut your opponent’s stones apart.

Before every move, check for atari: is one of your groups down to a single liberty? Can you put one of your opponent’s groups into atari? And aim for two eyes in any group that is in danger.

The four stars mark good first points on a 9×9 board. Next, you will choose a first move.

## firstmove.title
Your first move

## firstmove.text
On an empty 9×9 board, Black plays first. Where would you start? Ask me to explain the first move in more detail if you would like the reasons.

## firstmove.task
Place your first stone on a good point.

## firstmove.done
A good first move: a corner point on the third or fourth line balances territory and safety. Now you are ready to play a game.

## firstmove.low
That is on the first or second line: the stone has little room and few liberties. Press Reset and try a point nearer the third line, close to a corner.

## firstmove.away
That is a point away from the corners. It can work, but corners make territory with the fewest stones. Press Reset and try a corner.

## firstmove.close
Close, but a point on the third or fourth line works better. Press Reset and try again.
