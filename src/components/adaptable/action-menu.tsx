import { IonActionSheet } from "@ionic/react";
import { useId, useMemo, useRef, useState } from "react";
import _ from "lodash";
import { Slot } from "@radix-ui/react-slot";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/src/components/ui/dropdown-menu";
import { useMedia } from "../../lib/hooks";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { useSettingsStore } from "@/src/stores/settings";

export type SubAction<V = string> =
  | { text: string; onClick: () => any; value?: V; danger?: boolean }
  | {
      text: string;
      onClick?: undefined;
      value?: string;
      actions: {
        text: string;
        onClick: () => any;
        value?: V;
        danger?: boolean;
      }[];
      danger?: undefined;
    };

export interface ActionMenuProps<V = string>
  extends Omit<
    React.ComponentProps<typeof IonActionSheet>,
    "buttons" | "trigger"
  > {
  actions: (
    | "DIVIDER"
    | {
        text: string;
        value?: V;
        onClick: () => any;
        actions?: undefined;
        danger?: boolean;
      }
    | {
        text: string;
        value?: string;
        onClick?: undefined;
        actions: SubAction<V>[];
        danger?: undefined;
      }
  )[];
  selectedValue?: V;
  trigger: React.ReactNode;
  triggerAsChild?: boolean;
  onOpen?: () => any;
  align?: "start" | "end";
  showCancel?: boolean;
}

export function ActionMenu<V extends string>({
  trigger,
  triggerAsChild,
  actions,
  onOpen,
  align,
  showCancel,
  selectedValue,
  ...props
}: ActionMenuProps<V>) {
  const media = useMedia();
  const id = useId();

  // Mobile uses IonActionSheet, which only supports a flat list of buttons.
  // To render nested sections (tier 2) and sub-sections (tier 3), we maintain
  // a navigation stack of sub-sheets. Each entry holds the title and actions
  // for one level. The top of the stack is what's currently displayed.
  const [subStack, setSubStack] = useState<
    { title: string; actions: SubAction[] }[]
  >([]);
  const currentSub = subStack[subStack.length - 1];

  // IonActionSheet fires onWillDismiss (while still animating out) before
  // onDidDismiss (after fully closed). Pushing to subStack in onWillDismiss
  // would change currentSub mid-animation, causing the sheet content to
  // visually glitch as its buttons change while it's still closing. We defer
  // the push to onDidDismiss so the old sheet fully closes first, then the
  // new level mounts and plays its own open animation cleanly.
  const pendingPush = useRef<{ title: string; actions: SubAction[] } | null>(
    null,
  );

  const buttons: React.ComponentProps<typeof IonActionSheet>["buttons"] =
    useMemo(
      () => [
        // Store the original index in `data` (not the post-filter index) so
        // that onWillDismiss can look up the action in `actions` correctly even
        // when dividers are present — dividers shift post-filter indices.
        ...actions.flatMap((a, originalIndex) =>
          _.isString(a)
            ? []
            : [
                {
                  text: a.text,
                  data: originalIndex,
                  cssClass: a.actions ? "detail" : undefined,
                  role: a.danger
                    ? "destructive"
                    : _.isString(a.value) && a.value === selectedValue
                      ? "selected"
                      : undefined,
                },
              ],
        ),
        ...(showCancel
          ? [
              {
                text: "Cancel",
                role: "cancel",
              },
            ]
          : []),
      ],
      [actions, showCancel, selectedValue],
    );

  const subActionButtons:
    | React.ComponentProps<typeof IonActionSheet>["buttons"]
    | null = useMemo(
    () =>
      currentSub
        ? [
            ...currentSub.actions.map((a, index) => ({
              text: a.text,
              data: index,
              cssClass: "actions" in a ? "detail" : undefined,
              role: a.danger
                ? "destructive"
                : _.isString(a.value) && a.value === selectedValue
                  ? "selected"
                  : undefined,
            })),
            ...(showCancel
              ? [
                  {
                    text: "Cancel",
                    role: "cancel",
                  },
                ]
              : []),
          ]
        : null,
    [currentSub, showCancel, selectedValue],
  );

  const disableHaptics = useSettingsStore((s) => s.disableHaptics);

  if (media.md) {
    return (
      <DropdownMenu onOpenChange={(open) => open && onOpen?.()}>
        <DropdownMenuTrigger asChild={triggerAsChild} className="text-left">
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          {props.header && (
            <>
              <DropdownMenuLabel>{props.header}</DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          {actions.map((a, index) =>
            _.isString(a) ? (
              <DropdownMenuSeparator key={index} />
            ) : a.actions ? (
              <DropdownMenuSub key={a.text + index}>
                <DropdownMenuSubTrigger>{a.text}</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {a.actions.map((sa, saIndex) =>
                      "actions" in sa ? (
                        <DropdownMenuSub key={sa.text + saIndex}>
                          <DropdownMenuSubTrigger>
                            {sa.text}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {sa.actions.map((leaf, leafIndex) => (
                                <DropdownMenuItem
                                  key={leaf.text + leafIndex}
                                  onClick={leaf.onClick}
                                  className={cn(
                                    _.isString(sa.value) &&
                                      leaf.value === selectedValue &&
                                      "font-bold",
                                    leaf.danger && "text-destructive!",
                                  )}
                                >
                                  {leaf.text}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      ) : (
                        <DropdownMenuItem
                          key={sa.text + saIndex}
                          onClick={sa.onClick}
                          className={cn(
                            _.isString(a.value) &&
                              sa.value === selectedValue &&
                              "font-bold",
                            sa.danger && "text-destructive!",
                          )}
                        >
                          {sa.text}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            ) : (
              <DropdownMenuItem
                key={a.text + index}
                onClick={a.onClick}
                className={cn(
                  _.isString(a.value) &&
                    a.value === selectedValue &&
                    "font-bold",
                  a.danger && "text-destructive!",
                )}
              >
                {a.text}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const Button = triggerAsChild ? Slot : "button";

  return (
    <>
      <Button
        data-slot="button"
        id={id}
        onClick={() => {
          if (!disableHaptics) {
            Haptics.impact({ style: ImpactStyle.Medium });
          }
        }}
      >
        {trigger}
      </Button>
      {currentSub && (
        <IonActionSheet
          {...props}
          // Changing `key` forces React to unmount/remount the sheet, which
          // causes Ionic to play the open animation for the new level after a
          // pendingPush navigation.
          key={subStack.length}
          // Breadcrumb: at tier 3 show the parent level's title as the header
          // and the current level's title as the subHeader (e.g. "Community /
          // Share"). At tier 2 keep the original top-level header ("Post").
          header={
            subStack.length > 1
              ? subStack[subStack.length - 2]?.title
              : props.header
          }
          subHeader={currentSub.title}
          isOpen
          buttons={subActionButtons!}
          onWillDismiss={({ detail }) => {
            // detail.data holds the button index when a button was tapped;
            // it is undefined for backdrop/cancel dismissals.
            const index = _.isNumber(detail.data) ? detail.data : null;
            if (index !== null && currentSub) {
              const action = currentSub.actions[index];
              if (action && "onClick" in action && action.onClick) {
                // Leaf action — call immediately and close the sub-sheet flow.
                setSubStack([]);
                action.onClick();
              } else if (action && "actions" in action) {
                // Sub-section — store the next level so onDidDismiss can push
                // it after the current sheet finishes closing. We can't push
                // here because mutating subStack mid-animation would change the
                // sheet's buttons while they're still animating out.
                if (!disableHaptics) {
                  Haptics.impact({ style: ImpactStyle.Medium });
                }
                pendingPush.current = {
                  title: action.text,
                  actions: action.actions,
                };
              }
            }
          }}
          onDidDismiss={() => {
            if (pendingPush.current) {
              // A sub-section was tapped: push the next level. The `key` change
              // will remount the sheet so it animates in with the new content.
              const push = pendingPush.current;
              pendingPush.current = null;
              setSubStack((prev) => [...prev, push]);
            } else {
              // Backdrop/cancel tap: exit the sub-sheet flow entirely.
              setSubStack([]);
            }
          }}
          onWillPresent={(e) => {
            props.onWillPresent?.(e);
            onOpen?.();
          }}
        />
      )}
      <IonActionSheet
        {...props}
        trigger={id}
        buttons={buttons}
        onWillDismiss={({ detail }) => {
          const index = _.isNumber(detail.data) ? detail.data : null;
          if (index !== null && actions[index]) {
            const action = actions[index];
            if (_.isObject(action) && action.onClick) {
              action.onClick();
            } else if (_.isObject(action) && action.actions) {
              if (!disableHaptics) {
                Haptics.impact({ style: ImpactStyle.Medium });
              }
              setSubStack([{ title: action.text, actions: action.actions }]);
            }
          }
        }}
        onWillPresent={(e) => {
          props.onWillPresent?.(e);
          onOpen?.();
        }}
      />
    </>
  );
}

export function EllipsisActionMenu({
  fixRightAlignment,
  buttonClassName,
  "aria-label": ariaLabel = "Actions",
  ...props
}: Omit<ActionMenuProps, "trigger" | "triggerAsChild"> & {
  fixRightAlignment?: boolean;
  buttonClassName?: string;
  "aria-label"?: string;
}) {
  return (
    <ActionMenu
      {...props}
      trigger={
        <Button
          size="icon"
          variant="ghost"
          className={cn(fixRightAlignment && "-mr-2", buttonClassName)}
          aria-label={ariaLabel}
        >
          <IoEllipsisHorizontal size={16} />
        </Button>
      }
      triggerAsChild
    />
  );
}
