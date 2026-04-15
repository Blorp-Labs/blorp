import { Schemas } from "@/src/apis/api-blueprint";
import _ from "lodash";
import { cn } from "@/src/lib/utils";
import { RadioGroupItem, RadioGroup } from "../../ui/radio-group";
import { useId, useState } from "react";
import { Checkbox } from "../../ui/checkbox";
import { Button } from "../../ui/button";
import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";
import { useVotePostPollMutation } from "@/src/queries/post-mutations";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { ABOVE_LINK_OVERLAY } from "../config";
import { PersonAvatar } from "../../person/person-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { useRequireAuth } from "@/src/hooks";
dayjs.extend(utc);

function formatPercent(value: number) {
  return (value * 100).toFixed(1);
}

function PollItem({
  mostVotedOption,
  pct,
  text,
  showResults,
  myVote,
}: {
  mostVotedOption: boolean;
  pct: number;
  text: string;
  showResults: boolean;
  myVote: boolean | undefined;
}) {
  const me = useAuth((s) => getAccountSite(s.getSelectedAccount())?.me);
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
      <span className={cn("relative", mostVotedOption && "text-white")}>
        {text}
      </span>
      {me && myVote && (
        <Tooltip>
          <TooltipTrigger>
            <PersonAvatar actorId={me.apId} person={me} size="xs" />
          </TooltipTrigger>
          <TooltipContent>You voted for this option</TooltipContent>
        </Tooltip>
      )}
      <div className="flex-1" />
      {showResults && (
        <span className={cn("relative", mostVotedOption && "text-white")}>
          {formatPercent(pct)}%
        </span>
      )}
    </>
  );
}

export function PostPollEmbed({ post }: { post: Schemas.Post }) {
  const vote = useVotePostPollMutation(post.apId);
  const [myChoices, setMyChoices] = useState<number[]>([]);
  const id = useId();
  const requireAuth = useRequireAuth();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  if (!post.poll || post.poll.choices.length === 0) {
    return null;
  }
  const numVotesArr = post.poll.choices.map((choice) => choice.numVotes);
  const totalVotes = _.sum(numVotesArr);
  const mostVotedOption = Math.max(...numVotesArr);

  const endDate = post.poll.endDate;
  const ended = Boolean(endDate) && dayjs(endDate).isBefore(dayjs());

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
      className={cn(
        "p-2 border rounded-md flex flex-col gap-1",
        ABOVE_LINK_OVERLAY,
      )}
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
                      setMyChoices((prev) => {
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
                  className="flex flex-row flex-1 gap-2"
                >
                  <PollItem
                    showResults={showResults}
                    mostVotedOption={
                      !!mostVotedOption && mostVotedOption === choice.numVotes
                    }
                    pct={pct}
                    text={choice.text}
                    myVote={myVotes?.includes(choice.id)}
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
          onValueChange={(val) => setMyChoices([_.toNumber(val)])}
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
                  className="flex flex-row flex-1 gap-2"
                >
                  <PollItem
                    showResults={showResults}
                    mostVotedOption={
                      !!mostVotedOption && mostVotedOption === choice.numVotes
                    }
                    pct={pct}
                    text={choice.text}
                    myVote={myVotes?.includes(choice.id)}
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
        {_.compact([
          `${totalVotes} votes`,
          endDate &&
            `${ended ? "Ended" : "Ends"} ${dayjs(endDate).format("lll")}`,
        ]).join(" / ")}
      </span>
    </form>
  );
}
