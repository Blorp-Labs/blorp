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
import { useMedia } from "../../lib/hooks";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { useSettingsStore } from "@/src/stores/settings";

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
        actions: {
          text: string;
          onClick: () => any;
          value?: V;
          danger?: boolean;
        }[];
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
  const [subActionsTitle, setSubActionsTitle] = useState<string>();
  const [subActions, setSubActions] = useState<
    {
      text: string;
      onClick: () => any;
      value?: string;
      danger?: boolean;
    }[]
  >();

  const buttons: React.ComponentProps<typeof IonActionSheet>["buttons"] =
    useMemo(
      () => [
        ...actions
          .filter((a) => _.isObject(a))
          .map((a, index) => ({
            text: a.text,
            data: index,
            cssClass: a.actions ? "detail" : undefined,
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
      ],
      [actions, showCancel, selectedValue],
    );

  const subActionButtons:
    | React.ComponentProps<typeof IonActionSheet>["buttons"]
    | null = useMemo(
    () =>
      subActions
        ? [
            ...subActions.map((a, index) => ({
              text: a.text,
              data: index,
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
    [showCancel, subActions, selectedValue],
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
                    {a.actions.map((sa) => (
                      <DropdownMenuItem
                        key={sa.text + index}
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
                    ))}
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
      {subActionButtons && (
        <IonActionSheet
          {...props}
          subHeader={subActionsTitle}
          isOpen
          buttons={subActionButtons}
          onWillDismiss={({ detail }) => {
            const index = _.isNumber(detail.data) ? detail.data : null;
            if (index !== null && subActions) {
              const action = subActions[index];
              if (action && action.onClick) {
                setSubActions(undefined);
                setSubActionsTitle(undefined);
                action.onClick();
              }
            }
          }}
          onDidDismiss={() => setSubActions(undefined)}
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
            } else if (_.isObject(action)) {
              if (!disableHaptics) {
                Haptics.impact({ style: ImpactStyle.Medium });
              }
              setSubActions(action.actions);
              setSubActionsTitle(action.text);
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
  ...props
}: Omit<ActionMenuProps, "trigger" | "triggerAsChild"> & {
  fixRightAlignment?: boolean;
}) {
  return (
    <ActionMenu
      {...props}
      trigger={
        <Button
          size="icon"
          variant="ghost"
          className={cn(fixRightAlignment && "-mr-2")}
          aria-label="Comment actions"
        >
          <IoEllipsisHorizontal size={16} />
        </Button>
      }
      triggerAsChild
    />
  );
}
