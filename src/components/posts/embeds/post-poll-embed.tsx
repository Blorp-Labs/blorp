import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import _ from "lodash";
import { cn } from "@/src/lib/utils";
import { RadioGroupItem, RadioGroup } from "../../ui/radio-group";
import { useId, useState } from "react";
import { Checkbox } from "../../ui/checkbox";
import { Button } from "../../ui/button";
import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";
import { useVotePostPoll } from "@/src/lib/api/post-mutations";
import { useRequireAuth } from "../../auth-context";
import { useAuth } from "@/src/stores/auth";
dayjs.extend(utc);

function formatPercent(value: number) {
  return (value * 100).toFixed(1);
}

function PollItem({
  mostVotedOption,
  pct,
  text,
  showResults,
}: {
  mostVotedOption: boolean;
  pct: number;
  text: string;
  showResults: boolean;
}) {
  return (
    <>
      {showResults && (
        <div
          className={cn(
            "absolute -z-10 left-0 inset-y-0 bg-secondary transition-[width]",
            mostVotedOption && "bg-brand-secondary",
          )}
          style={{ width: `${pct * 100}%` }}
        />
      )}
      <span className="relative">{text}</span>
      {showResults && <span className="relative">{formatPercent(pct)}%</span>}
    </>
  );
}

export function PostPollEmbed({ post }: { post: Schemas.Post }) {
  const vote = useVotePostPoll(post.apId);
  const [myChoices, setMyChoises] = useState<number[]>([]);
  const id = useId();
  const requireAuth = useRequireAuth();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  if (!post.poll || post.poll.choices.length === 0) {
    return null;
  }
  const numVotesArr = post.poll.choices.map((choice) => choice.numVotes);
  const totalVotes = _.sum(numVotesArr);
  const mosteVotedOption = Math.max(...numVotesArr);

  const ended = dayjs(post.poll.endDate).isBefore(dayjs());

  const myVotes = post.poll.myVotes;
  const showResults = ended || Boolean(myVotes && myVotes.length);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        requireAuth().then(() =>
          vote.mutate({ postId: post.id, choiceId: myChoices }),
        );
      }}
      className="p-2 border rounded-md flex flex-col gap-1"
    >
      {post.poll.mode === "multiple" && (
        <div className="flex flex-col gap-2">
          {post.poll.choices.map((choice) => {
            const pct = totalVotes ? choice.numVotes / totalVotes : 0;
            return (
              <div
                key={choice.id}
                className="flex flex-row items-center border px-3 py-1.5 rounded-md relative overflow-hidden"
              >
                {!myVotes && !ended && (
                  <Checkbox
                    className="mr-2"
                    id={id + choice.id}
                    checked={myChoices.includes(choice.id)}
                    onCheckedChange={(val) =>
                      setMyChoises((prev) => {
                        if (!val) {
                          return prev.filter((item) => item !== choice.id);
                        } else {
                          return [...prev, choice.id];
                        }
                      })
                    }
                  />
                )}
                <label
                  htmlFor={id + choice.id}
                  className="flex flex-row flex-1 justify-between"
                >
                  <PollItem
                    showResults={showResults}
                    mostVotedOption={
                      !!mosteVotedOption && mosteVotedOption === choice.numVotes
                    }
                    pct={pct}
                    text={choice.text}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}

      {post.poll.mode === "single" && (
        <RadioGroup
          disabled={ended}
          className="flex flex-col gap-2"
          value={myChoices[0] ? String(myChoices[0]) : null}
          onValueChange={(val) => setMyChoises([_.toNumber(val)])}
        >
          {post.poll.choices.map((choice) => {
            const pct = totalVotes ? choice.numVotes / totalVotes : 0;
            return (
              <div
                key={choice.id}
                className="flex flex-row items-center gap-2 border px-2.5 py-1.5 rounded-md relative overflow-hidden"
              >
                {!myVotes && !ended && (
                  <RadioGroupItem
                    value={String(choice.id)}
                    className="rounded-md flex relative"
                    id={id + choice.id}
                  />
                )}
                <label
                  htmlFor={id + choice.id}
                  className="flex flex-row flex-1 justify-between"
                >
                  <PollItem
                    showResults={showResults}
                    mostVotedOption={
                      !!mosteVotedOption && mosteVotedOption === choice.numVotes
                    }
                    pct={pct}
                    text={choice.text}
                  />
                </label>
              </div>
            );
          })}
        </RadioGroup>
      )}

      {!post.poll.myVotes && myChoices.length > 0 && (
        <Button className="w-full">
          {isLoggedIn ? "Cast vote" : "Login to vote"}
        </Button>
      )}

      <span className="text-sm text-muted-foreground">
        {totalVotes} votes / {ended ? "Ended " : "Ends "}
        {dayjs(post.poll.endDate).format("lll")}
      </span>
    </form>
  );
}
