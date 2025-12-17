import * as React from "react";
import { twMerge } from "tailwind-merge";

/**
 * Gutters that prevent the content from going full width on large screens.
 *
 * There are two ways to use this component
 *
 * @example
 *    <ContentGutters>
 *      <div className="flex-1">
 *        I fill the entire content area
 *      </div>
 *    </ContentGutters>
 *
 * @example
 *    <ContentGutters>
 *      <div className="flex-1">
 *        I am the main content
 *      </div>
 *      <div>
 *        I function as a side bar
 *      </div>
 *    </ContentGutters>
 *
 *  You can also do this if you want to leave space for the sidebar
 *  @example
 *    <ContentGutters>
 *      <div className="flex-1">
 *        I am the main content
 *      </div>
 *      <></>
 *    </ContentGutters>
 */
export function ContentGutters({
  children,
  noMobilePadding,
  ...props
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  noMobilePadding?: boolean;
}) {
  const [first, second] = React.Children.toArray(children);
  return (
    <div
      {...props}
      className={twMerge(
        "max-w-[1075px] w-full grid grid-cols-1 mx-auto gap-4 px-3.5 md:px-6",
        !!second &&
          "md:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_290px]",
        noMobilePadding && "px-0",
        props.className,
      )}
    >
      {second ? (
        <>
          {first}
          <div className="max-md:hidden relative">{second}</div>
        </>
      ) : (
        first
      )}
    </div>
  );
}

ContentGutters.mobilePadding = "max-md:px-3.5!";
