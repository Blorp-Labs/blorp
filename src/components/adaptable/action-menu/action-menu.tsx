import { IonActionSheet } from "@ionic/react";
import { useMemo, useRef, useState } from "react";
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
  DropdownMenuCheckboxItem,
} from "@/src/components/ui/dropdown-menu";
import { useMedia } from "../../../hooks";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { ThemeComponent } from "../../theme-components";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { useSettingsStore } from "@/src/stores/settings";

export type Action<V = string> =
  | "DIVIDER"
  | ({
      text: string;
      value?: V;
      danger?: boolean;
      checked?: boolean;
    } & (
      | {
          onClick: () => any;
          actions?: undefined;
        }
      | {
          onClick?: undefined;
          actions: Action<V>[];
        }
    ));

export type SubAction<V = string> = Action<V>;

export interface ActionMenuProps<V = string>
  extends Omit<
    React.ComponentProps<typeof IonActionSheet>,
    "buttons" | "trigger"
  > {
  actions: Action<V>[];
  selectedValue?: V;
  trigger: React.ReactNode;
  triggerAsChild?: boolean;
  onOpen?: () => any;
  align?: "start" | "end";
  showCancel?: boolean;
  preventFocusReturnOnClose?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type MobileStackEntry<V extends string> = {
  title: string;
  parentTitle?: string;
  actions: Action<V>[];
  isRoot?: boolean;
};

function isSubmenuAction<V extends string>(
  action: Action<V>,
): action is Extract<Action<V>, { actions: Action<V>[] }> {
  return !_.isString(action) && Array.isArray(action.actions);
}

function renderDropdownAction<V extends string>(
  action: Action<V>,
  indexKey: string,
  selectedValue?: V,
) {
  if (_.isString(action)) {
    return <DropdownMenuSeparator key={indexKey} />;
  }

  if (isSubmenuAction(action)) {
    return (
      <DropdownMenuSub key={indexKey}>
        <DropdownMenuSubTrigger>{action.text}</DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            {action.actions.map((child, index) =>
              renderDropdownAction(
                child,
                `${indexKey}-${index}`,
                selectedValue,
              ),
            )}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  if (action.checked !== undefined) {
    return (
      <DropdownMenuCheckboxItem
        key={indexKey}
        checked={action.checked}
        onCheckedChange={action.onClick}
        className={cn(action.danger && "text-destructive!")}
      >
        {action.text}
      </DropdownMenuCheckboxItem>
    );
  }

  return (
    <DropdownMenuItem
      key={indexKey}
      onClick={action.onClick}
      className={cn(
        _.isString(action.value) &&
          action.value === selectedValue &&
          "font-bold",
        action.danger && "text-destructive!",
      )}
    >
      {action.text}
    </DropdownMenuItem>
  );
}

export function ActionMenu<V extends string>({
  trigger,
  triggerAsChild,
  actions,
  onOpen,
  align,
  showCancel,
  selectedValue,
  preventFocusReturnOnClose,
  onOpenChange,
  ...props
}: ActionMenuProps<V>) {
  const media = useMedia();

  // Mobile uses IonActionSheet, which only supports a flat list of buttons.
  // To render nested sections (tier 2) and sub-sections (tier 3), we maintain
  // a navigation stack in React state. Each entry holds the title and actions
  // for one level. The top of the stack is what's currently displayed.
  const [mobileStack, setMobileStack] = useState<MobileStackEntry<V>[]>([]);
  const currentMobileSheet = mobileStack[mobileStack.length - 1];
  const mobileMenuOpenRef = useRef(false);
  const isNavigatingMobileSheetRef = useRef(false);
  const emitMobileOpenChange = (nextOpen: boolean) => {
    if (nextOpen !== mobileMenuOpenRef.current) {
      mobileMenuOpenRef.current = nextOpen;
      onOpenChange?.(nextOpen);
    }
  };

  const disableHaptics = useSettingsStore((s) => s.disableHaptics);

  const mobileButtons: React.ComponentProps<typeof IonActionSheet>["buttons"] =
    useMemo(() => {
      if (!currentMobileSheet) {
        return [];
      }

      const btns: NonNullable<
        React.ComponentProps<typeof IonActionSheet>["buttons"]
      > = currentMobileSheet.actions.flatMap((action, originalIndex) =>
        _.isString(action)
          ? []
          : [
              {
                text: action.text,
                data: originalIndex,
                cssClass: "actions" in action ? "detail" : undefined,
                role: action.danger
                  ? "destructive"
                  : (_.isString(action.value) &&
                        action.value === selectedValue) ||
                      ("checked" in action && action.checked === true)
                    ? "selected"
                    : undefined,
              },
            ],
      );

      if (showCancel) {
        btns.push({ text: "Cancel", role: "cancel" });
      }

      return btns;
    }, [currentMobileSheet, selectedValue, showCancel]);

  const openMobileRootSheet = () => {
    if (!disableHaptics) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }

    setMobileStack([
      {
        title: props.header ?? "",
        actions,
        isRoot: true,
      },
    ]);
    emitMobileOpenChange(true);
    onOpen?.();
  };

  const pushMobileSubSheet = (
    action: Extract<Action<V>, { actions: Action<V>[] }>,
    currentSheet: MobileStackEntry<V>,
  ) => {
    if (!disableHaptics) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }

    setMobileStack((prev) => [
      ...prev,
      {
        title: action.text,
        parentTitle: currentSheet.isRoot
          ? currentSheet.title || props.header
          : currentSheet.title,
        actions: action.actions,
      },
    ]);
  };

  const closeMobileSheets = () => {
    setMobileStack([]);
    emitMobileOpenChange(false);
  };

  if (media.md) {
    return (
      <DropdownMenu
        onOpenChange={(open) => {
          onOpenChange?.(open);
          if (open) {
            onOpen?.();
          }
        }}
      >
        <DropdownMenuTrigger asChild={triggerAsChild} className="text-left">
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          onCloseAutoFocus={
            preventFocusReturnOnClose ? (e) => e.preventDefault() : undefined
          }
        >
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
              return renderDropdownAction(a, `${index}`, selectedValue);
            }

            return renderDropdownAction(a, `${index}`, selectedValue);
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
        onClick={openMobileRootSheet}
      >
        {trigger}
      </Button>
      {currentMobileSheet && (
        <IonActionSheet
          key={mobileStack.length}
          {...props}
          header={currentMobileSheet.parentTitle}
          subHeader={
            currentMobileSheet.isRoot ? undefined : currentMobileSheet.title
          }
          isOpen
          buttons={mobileButtons}
          onWillPresent={(e) => {
            isNavigatingMobileSheetRef.current = false;
            props.onWillPresent?.(e);
          }}
          onWillDismiss={(e) => {
            const index = _.isNumber(e.detail.data) ? e.detail.data : null;
            if (index === null) {
              closeMobileSheets();
              return;
            }

            const action = currentMobileSheet.actions[index];
            if (!action || _.isString(action)) {
              closeMobileSheets();
              return;
            }

            if (isSubmenuAction(action)) {
              isNavigatingMobileSheetRef.current = true;
              pushMobileSubSheet(action, currentMobileSheet);
              return;
            }

            action.onClick();
            closeMobileSheets();
          }}
          onDidDismiss={(e) => {
            if (isNavigatingMobileSheetRef.current) {
              return;
            }

            props.onDidDismiss?.(e);
            emitMobileOpenChange(false);
          }}
        />
      )}
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
