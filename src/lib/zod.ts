import { z } from "zod";

type InvalidEnumIssue = Extract<
  z.ZodIssueOptionalMessage,
  { code: typeof z.ZodIssueCode.invalid_enum_value }
>;

export function zodEnumMessage(
  strings: TemplateStringsArray,
  ...fns: Array<(issue: InvalidEnumIssue) => string | number>
) {
  return {
    errorMap: (issue: z.ZodIssueOptionalMessage) => ({
      message:
        issue.code === z.ZodIssueCode.invalid_enum_value
          ? strings.reduce<string>(
              (acc, str, i) => acc + String(fns[i - 1]?.(issue) ?? "") + str,
              "",
            )
          : strings.join(""),
    }),
  };
}

export function getFirstZodIssue(error: Error | null | undefined) {
  return error instanceof z.ZodError ? error.issues[0] : undefined;
}
