import { IonActionSheet } from "@ionic/react";
import { useId, useMemo, useState } from "react";
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
import { useMedia } from "../../../hooks";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { ThemeComponent } from "../../theme-components";
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

  const disableHaptics = useSettingsStore((s) => s.disableHaptics);

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
    | null = useMemo(() => {
    if (!currentSub) {
      return null;
    }

    const btns: NonNullable<
      React.ComponentProps<typeof IonActionSheet>["buttons"]
    > = currentSub.actions.map((a, index) => ({
      text: a.text,
      data: index,
      cssClass: "actions" in a ? "detail" : undefined,
      role: a.danger
        ? "destructive"
        : _.isString(a.value) && a.value === selectedValue
          ? "selected"
          : undefined,
    }));

    if (showCancel) {
      btns.push({ text: "Cancel", role: "cancel" });
    }

    return btns;
  }, [currentSub, showCancel, selectedValue]);

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
          {actions.map((a, index) => {
            const isFirstItem = index === 0;
            const isLastItem = index === actions.length - 1;

            if (_.isString(a)) {
              if (isFirstItem || isLastItem) {
                return null;
              }
              return <DropdownMenuSeparator key={index} />;
            }

            if (a.actions) {
              return (
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
              );
            }

            return (
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
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const Button = triggerAsChild ? Slot : "button";

  return (
    <>
      <Button
        data-theme-component={ThemeComponent.Button}
        data-variant="ghost"
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
          key={subStack.length}
          {...props}
          header={
            subStack.length > 1
              ? subStack[subStack.length - 2]?.title
              : props.header
          }
          subHeader={currentSub.title}
          isOpen
          buttons={subActionButtons ?? []}
          onWillDismiss={({ detail }) => {
            const index = _.isNumber(detail.data) ? detail.data : null;
            if (index !== null && currentSub.actions[index]) {
              const action = currentSub.actions[index];
              if ("onClick" in action && action.onClick) {
                action.onClick();
                setSubStack([]);
              } else if ("actions" in action) {
                // Push immediately so the new sheet mounts (via key change)
                // while the old one is still animating out, overlapping the
                // dismiss/present animations for a snappier transition.
                if (!disableHaptics) {
                  Haptics.impact({ style: ImpactStyle.Medium });
                }
                setSubStack((prev) => [
                  ...prev,
                  { title: action.text, actions: action.actions },
                ]);
              }
            }
          }}
          // Only fires for cancel/backdrop — sub-section pushes unmount this
          // sheet (via key change) before onDidDismiss can run.
          onDidDismiss={() => setSubStack([])}
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
