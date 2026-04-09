import type z from "zod";
import { AlertInput, useIonAlert } from "@ionic/react";
import { Deferred } from "../lib/deferred";

export function useSelectAlert() {
  const [alrt] = useIonAlert();
  return async <T extends string>({
    header,
    message,
    options,
    cancelText = "Cancel",
  }: {
    header?: string;
    message?: string;
    options: { text: string; value: T }[];
    cancelText?: string;
  }): Promise<T> => {
    const deferred = new Deferred<T>();
    alrt({
      header,
      message,
      buttons: [
        ...options.map((opt) => ({
          text: opt.text,
          handler: () => deferred.resolve(opt.value),
        })),
        { text: cancelText, role: "cancel" },
      ],
      onDidDismiss: (e) => {
        if (e.detail.role === "cancel" || e.detail.role === "backdrop") {
          deferred.reject();
        }
      },
    });
    return deferred.promise;
  };
}

export function useConfirmationAlert() {
  const [alrt] = useIonAlert();

  return async <Z extends z.AnyZodObject>({
    header,
    message,
    cancelText = "Cancel",
    confirmText = "OK",
    danger,
    // Ionic with crash if you pass undefined
    // instead of an empty array
    inputs = [],
    schema,
  }: {
    header?: string;
    message: string;
    cancelText?: string;
    confirmText?: string;
    danger?: boolean;
    inputs?: AlertInput[];
    schema?: Z;
  }) => {
    const deferred = new Deferred<z.infer<Z>>();
    alrt({
      header,
      message,
      inputs,
      buttons: [
        {
          text: cancelText,
          role: "cancel",
        },
        {
          text: confirmText,
          role: danger ? "destructive" : "confirm",
        },
      ],
      onDidDismiss: (e) => {
        if (e.detail.role === "cancel" || e.detail.role === "backdrop") {
          deferred.reject();
        } else {
          try {
            const data = schema?.parse(e.detail.data.values);
            deferred.resolve(data);
          } catch (err) {
            console.error(err);
            deferred.reject();
          }
        }
      },
    });
    return await deferred.promise;
  };
}

export function useInputAlert() {
  const [alrt] = useIonAlert();

  return async ({
    header,
    message,
    placeholder,
  }: {
    header?: string;
    message?: string;
    placeholder?: string;
  }) => {
    const deferred = new Deferred<string>();
    alrt({
      header,
      message,
      inputs: [{ placeholder, name: "value" }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "OK", role: "confirm" },
      ],
      onDidDismiss: (e) => {
        if (e.detail.role === "cancel" || e.detail.role === "backdrop") {
          deferred.reject();
        } else {
          const val = e.detail.data?.values?.value ?? "";
          if (val) {
            deferred.resolve(val);
          } else {
            deferred.reject();
          }
        }
      },
    });
    return await deferred.promise;
  };
}
