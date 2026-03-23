import {
  Editor,
  EditorContent,
  getMarkRange,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import type { NodeViewRenderer } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import {
  DetailsWithMarkdown,
  DetailsContentWithMarkdown,
  DetailsSummaryWithMarkdown,
} from "./editor-extensions/spoiler-plugin";
import Subscript from "./editor-extensions/subscript";
import Superscript from "./editor-extensions/supscript";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "../ui/button";
import {
  AiOutlineBold,
  AiOutlineItalic,
  AiOutlineStrikethrough,
} from "react-icons/ai";
import { FaQuoteRight } from "react-icons/fa6";
import { Toggle } from "../ui/toggle";
import { cn } from "@/src/lib/utils";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { CodeBlockEditor, lowlight } from "./code-block";
import { useSettingsStore } from "@/src/stores/settings";
import { IoLogoMarkdown, IoDocumentText, IoLink } from "react-icons/io5";
import { useUploadImageMutation } from "@/src/queries";
import { LuImageUp } from "react-icons/lu";
import { useIonAlert } from "@ionic/react";
import { Deferred } from "@/src/lib/deferred";
import z from "zod";
import { EllipsisActionMenu } from "../adaptable/action-menu";
import { MdOutlineFormatClear } from "react-icons/md";
import Mention from "@tiptap/extension-mention";
import { useMentionSuggestions } from "./editor-extensions/mention";

/** Strip trailing &nbsp; markers that @tiptap/extension-paragraph emits for empty paragraphs */
function stripTrailingNbsp(md: string): string {
  let result = md.replace(/(\n\n&nbsp;)+$/, "");
  if (result === "&nbsp;") result = "";
  return result;
}

export function getMarkdown(editor: Editor): string {
  return stripTrailingNbsp(editor.getMarkdown());
}

export function setMarkdown(editor: Editor, md: string): void {
  editor.commands.setContent(md, { contentType: "markdown" });
}

/**
 * Insert a link at the current selection, replacing the selected text with
 * `description` and applying `href`. Works correctly with both TextSelection
 * (manual drag) and AllSelection (Ctrl+A).
 *
 * AllSelection sets from=0 (a node-boundary position), so arithmetic like
 * `from + description.length` is off by the paragraph node offset. Instead
 * we read the actual cursor position after insertContent and back-calculate
 * the inserted range from there.
 */
export function insertLink(
  editor: Editor,
  description: string,
  href: string,
): void {
  const { from, to } = editor.state.selection;
  editor
    .chain()
    .focus()
    .setTextSelection({ from, to })
    .insertContent(description)
    .command(({ state, commands }) => {
      const end = state.selection.from;
      const start = end - description.length;
      return commands.setTextSelection({ from: start, to: end });
    })
    .setLink({ href })
    .command(({ state, commands }) =>
      commands.setTextSelection({
        from: state.selection.to,
        to: state.selection.to,
      }),
    )
    .run();
}

const CustomLink = Link.extend({
  inclusive: false,
});

const linkSchema = z.object({
  description: z.string(),
  url: z.string(),
});

function IconFileInput({ onFiles }: { onFiles: (file: File[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            onFiles(Array.from(event.target.files));
          }
        }}
      />
      <Toggle
        data-state="off"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Upload File"
      >
        <LuImageUp />
      </Toggle>
    </>
  );
}

function getActiveLinkInfo(editor: Editor) {
  const { state } = editor;
  const linkType = state.schema.marks["link"];
  const { $from } = state.selection;

  if (!linkType) {
    return null;
  }

  const range = getMarkRange($from, linkType);
  if (!range) {
    return null;
  }

  const text = state.doc.textBetween(range.from, range.to, undefined, "\uFFFC");
  const attrs = editor.getAttributes("link"); // href, target, etc.
  return { text, href: attrs["href"], range };
}

function useRenderOnTipTapChange(editor: Editor | null) {
  const [, setSignal] = useState(0);
  useEffect(() => {
    if (!editor) {
      return;
    }
    const rerender = () => setSignal((x) => x + 1);
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
    };
  }, [editor]);
}

const MenuBar = ({
  editor,
  onFiles,
  className,
}: {
  editor: Editor | null;
  onFiles: (file: File[]) => void;
  className?: string;
}) => {
  const [alrt] = useIonAlert();

  useRenderOnTipTapChange(editor);

  if (!editor) {
    return null;
  }
  return (
    <div className={cn("flex flex-row items-center gap-1.5", className)}>
      <IconFileInput onFiles={onFiles} />

      <Toggle
        size="icon"
        data-state={editor.isActive("link") ? "on" : "off"}
        type="button"
        onClick={async () => {
          const isLinkActive = editor.isActive("link");
          const linkInfo = getActiveLinkInfo(editor);

          const { from, to } = editor.state.selection;
          const selectedText = editor.state.doc.textBetween(from, to, " ");

          try {
            const deferred = new Deferred<z.infer<typeof linkSchema>>();
            alrt({
              header: "Insert link",
              inputs: [
                {
                  name: "description",
                  placeholder: "Description",
                  value: linkInfo
                    ? linkInfo.text || linkInfo.href
                    : selectedText,
                },
                {
                  name: "url",
                  placeholder: "https://join-lemmy.org",
                  value: linkInfo?.href,
                },
              ],
              buttons: [
                {
                  text: "Cancel",
                  role: "cancel",
                  handler: () => deferred.reject(),
                },
                {
                  text: "OK",
                  role: "confirm",
                  handler: (v) => {
                    try {
                      const link = linkSchema.parse(v);
                      deferred.resolve(link);
                    } catch {
                      deferred.reject();
                    }
                  },
                },
              ],
            });
            let { url, description } = await deferred.promise;
            description = description.trim() || url;

            if (url.trim() === "") {
              editor.chain().focus().unsetLink().run();
            } else if (isLinkActive && linkInfo) {
              // Collect existing marks (bold, italic, etc.) excluding the old link
              const nodeAtStart = editor.state.doc.nodeAt(linkInfo.range.from);
              const existingMarks = (nodeAtStart?.marks ?? [])
                .filter((m) => m.type.name !== "link")
                .map((m) => ({ type: m.type.name, attrs: m.attrs }));

              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .insertContent([
                  {
                    type: "text",
                    text: description,
                    marks: [
                      ...existingMarks,
                      { type: "link", attrs: { href: url } },
                    ],
                  },
                ])
                .run();
            } else {
              insertLink(editor, description, url);
            }
          } catch {}
        }}
        aria-label={
          editor.isActive("link") ? "Link selected text" : "Insert link"
        }
      >
        <IoLink />
      </Toggle>

      <Toggle
        size="icon"
        data-state={editor.isActive("bold") ? "on" : "off"}
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().toggleBold().run()}
        aria-label={editor.isActive("bold") ? "Unbold" : "Bold"}
      >
        <AiOutlineBold />
      </Toggle>

      <Toggle
        size="icon"
        data-state={editor.isActive("italic") ? "on" : "off"}
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().toggleItalic().run()}
        aria-label={editor.isActive("italic") ? "Unitalicize" : "Italicize"}
      >
        <AiOutlineItalic />
      </Toggle>

      <Toggle
        size="icon"
        data-state={editor.isActive("strike") ? "on" : "off"}
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().toggleStrike().run()}
        aria-label={
          editor.isActive("bold") ? "Unstrikethrough" : "Strikethrough"
        }
      >
        <AiOutlineStrikethrough />
      </Toggle>

      <Toggle
        size="icon"
        data-state={editor.isActive("blockquote") ? "on" : "off"}
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={!editor.can().chain().toggleBlockquote().run()}
        aria-label={editor.isActive("blockquote") ? "Unquote" : "Quote"}
      >
        <FaQuoteRight />
      </Toggle>

      <Toggle
        size="icon"
        data-state="off"
        type="button"
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
        aria-label="Clear format"
      >
        <MdOutlineFormatClear />
      </Toggle>

      {/* <button */}
      {/*   type="button" */}
      {/*   onClick={() => editor.chain().focus().clearNodes().run()} */}
      {/* > */}
      {/*   Clear nodes */}
      {/* </button> */}

      {/* <button */}
      {/*   type="button" */}
      {/*   onClick={() => editor.chain().focus().setHardBreak().run()} */}
      {/* > */}
      {/*   Hard break */}
      {/* </button> */}

      <EllipsisActionMenu
        aria-label="More formatting options"
        preventFocusReturnOnClose
        actions={[
          {
            text: "Horizontal Line",
            onClick: () => editor.chain().focus().setHorizontalRule().run(),
          },
          {
            text: "Spoiler",
            onClick: () => {
              editor
                .chain()
                .focus()
                .insertContent(
                  `<details open><summary>Spoiler</summary><p>Content</p></details>`,
                )
                .run();
            },
          },
          {
            text: "Code",
            checked: editor.isActive("codeBlock"),
            onClick: () => editor.chain().focus().toggleCodeBlock().run(),
          },
          {
            text: "Unordered List",
            checked: editor.isActive("bulletList"),
            onClick: () => editor.chain().focus().toggleBulletList().run(),
          },
          {
            text: "Ordered List",
            checked: editor.isActive("orderedList"),
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
          },
          {
            text: "Subscript",
            checked: editor.isActive("subscript"),
            onClick: () => editor.chain().focus().toggleSubscript().run(),
          },
          {
            text: "Superscript",
            checked: editor.isActive("superscript"),
            onClick: () => editor.chain().focus().toggleSuperscript().run(),
          },
        ]}
      />
    </div>
  );
};

export function getEditorExtensions({
  placeholder,
  codeBlockRenderer,
  mentionSuggestions,
}: {
  placeholder?: string;
  codeBlockRenderer?: NodeViewRenderer;
  mentionSuggestions?: ReturnType<typeof useMentionSuggestions>;
} = {}) {
  return [
    Markdown,
    ...(placeholder !== undefined
      ? [Placeholder.configure({ placeholder })]
      : []),
    StarterKit.configure({
      codeBlock: false,
      // Disable StarterKit's built-in Link — we register CustomLink below
      // to avoid the "Duplicate extension names found: ['link']" warning.
      link: false,
    }),
    Image.configure({ inline: true }),
    codeBlockRenderer
      ? CodeBlockLowlight.extend({
          addNodeView() {
            return codeBlockRenderer;
          },
        }).configure({ lowlight })
      : CodeBlockLowlight.configure({ lowlight }),
    CustomLink.configure({
      autolink: true,
      defaultProtocol: "https",
    }),
    TableKit.configure({
      table: { resizable: true },
    }),
    ...(mentionSuggestions
      ? [
          Mention.configure({
            HTMLAttributes: { class: "mention" },
            suggestions: mentionSuggestions,
          }),
        ]
      : []),
    Subscript,
    Superscript,
    DetailsWithMarkdown.configure({
      HTMLAttributes: {
        class: "details",
      },
    }),
    DetailsSummaryWithMarkdown,
    DetailsContentWithMarkdown,
  ];
}

function TipTapEditor({
  autoFocus,
  content,
  onChange,
  onChangeEditorType,
  placeholder,
  onFocus,
  onBlur,
  onSubmit,
  id,
  hideMenu,
}: {
  autoFocus?: boolean;
  content: string;
  onChange: (content: string) => void;
  onChangeEditorType: () => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  id?: string;
  hideMenu?: boolean;
}) {
  const uploadImage = useUploadImageMutation();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("only images can be uploaded");
    }
    return uploadImage.mutateAsync({
      image: file,
    });
  };

  const mentionSuggestions = useMentionSuggestions();

  const editor = useEditor({
    // TipTap no longer rerenders on every
    // change. Our custom menubar component
    // subscribes to tiptap changes and makes
    // sure the state of the buttons are in sync.
    // If there are any issues down the road, try
    // uncommenting the line below.
    // shouldRerenderOnTransaction: true,
    autofocus: false,
    onCreate({ editor }) {
      if (autoFocus) {
        editor.commands.focus("end");
      }
    },
    extensions: getEditorExtensions({
      placeholder,
      codeBlockRenderer: ReactNodeViewRenderer(CodeBlockEditor),
      mentionSuggestions,
    }),
    onUpdate: ({ editor }) => {
      onChange(getMarkdown(editor));
    },
    onFocus: () => onFocus?.(),
    onBlur,
    editorProps: {
      // start auto-scrolling when the cursor is within 80px of the top/bottom
      scrollThreshold: 50,
      // once scrolling, always leave an 80px buffer above/below the cursor
      scrollMargin: 50,
      attributes: {
        class: "flex-1 min-h-full space-y-4 outline-none",
      },
      handleKeyDown: (_view, event) => {
        if (
          onSubmit &&
          event.key === "Enter" &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          onSubmit();
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (event.clipboardData && event.clipboardData.files.length > 0) {
          for (const file of Array.from(event.clipboardData?.files ?? [])) {
            handleFile(file).then(({ url }) => {
              const { schema, tr, selection } = view.state;
              const { from } = selection;

              if (schema.nodes["image"] && schema.nodes["hardBreak"]) {
                const imageNode = schema.nodes["image"].create({ src: url });
                const hardBreak = schema.nodes["hardBreak"].create();
                const transaction = tr
                  .insert(from, hardBreak)
                  .insert(from + hardBreak.nodeSize, imageNode)
                  .insert(
                    from + hardBreak.nodeSize + imageNode.nodeSize,
                    hardBreak.copy(),
                  );
                view.dispatch(transaction);
              } else {
                console.error("Image node is not defined in the schema");
              }
            });
          }
          return true; // prevent default paste behavior
        }
        return false; // allow default behavior for non-files
      },
      handleDrop: (view, event, slice, moved) => {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files.length > 0
        ) {
          event.preventDefault();
          for (const file of Array.from(event.dataTransfer.files)) {
            handleFile(file).then(({ url }) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (schema.nodes["image"] && schema.nodes["hardBreak"]) {
                const insertPos = coordinates?.pos ?? 0;
                const imageNode = schema.nodes["image"].create({ src: url });
                const hardBreak = schema.nodes["hardBreak"].create();
                const transaction = view.state.tr
                  .insert(insertPos, hardBreak)
                  .insert(insertPos + hardBreak.nodeSize, imageNode)
                  .insert(
                    insertPos + hardBreak.nodeSize + imageNode.nodeSize,
                    hardBreak.copy(),
                  );
                return view.dispatch(transaction);
              } else {
                console.error("Failed to handle dropped image");
              }
            });
          }
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (getMarkdown(editor) !== content) {
      setMarkdown(editor, content);
    }
  }, [content, editor]);

  return (
    <>
      <div
        className={cn(
          "flex flex-row justify-between py-1.5 px-2 pb-0 max-md:hidden",
          hideMenu && "hidden",
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        <MenuBar
          editor={editor}
          onFiles={(files) => {
            for (const file of files) {
              handleFile(file).then(({ url }) => {
                if (url) {
                  const { to } = editor.state.selection;
                  editor
                    ?.chain()
                    .focus()
                    .setTextSelection(to)
                    .setHardBreak()
                    .setImage({ src: url })
                    .setHardBreak()
                    .run();
                }
              });
            }
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          type="button"
          className="max-md:hidden"
          onClick={onChangeEditorType}
        >
          Show markdown editor
        </Button>
        <Button
          size="icon"
          variant="ghost"
          type="button"
          className="md:hidden"
          onClick={onChangeEditorType}
          aria-label="Show markdown editor"
        >
          <IoLogoMarkdown />
        </Button>
      </div>
      <EditorContent
        id={id}
        className="markdown-content flex-1 max-w-full leading-normal py-2 px-3 md:px-3.5"
        editor={editor}
      />
      <div
        className={cn(
          "flex flex-row justify-between px-2 py-1 md:hidden sticky bottom-0 bg-background/50 backdrop-blur",
          hideMenu && "hidden",
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        <MenuBar
          className="gap-2.5"
          editor={editor}
          onFiles={(files) => {
            for (const file of files) {
              handleFile(file).then(({ url }) => {
                if (url) {
                  const { to } = editor.state.selection;
                  editor
                    ?.chain()
                    .focus()
                    .setTextSelection(to)
                    .setHardBreak()
                    .setImage({ src: url })
                    .setHardBreak()
                    .run();
                }
              });
            }
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          type="button"
          className="max-md:hidden"
          onClick={onChangeEditorType}
        >
          Show markdown editor
        </Button>
        <Button
          size="icon"
          variant="ghost"
          type="button"
          className="md:hidden"
          onClick={onChangeEditorType}
          aria-label="Show markdown editor"
        >
          <IoLogoMarkdown />
        </Button>
      </div>
    </>
  );
}

function TextAreaEditor({
  content,
  onChange,
  onChangeEditorType,
  autoFocus,
  placeholder,
  onFocus,
  onBlur,
  onSubmit,
  id,
  hideMenu,
}: {
  content: string;
  onChange: (content: string) => void;
  onChangeEditorType: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  id?: string;
  hideMenu?: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "flex flex-row justify-end py-1.5 px-2 pb-0 max-md:hidden",
          hideMenu && "hidden",
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Button
          size="sm"
          variant="ghost"
          type="button"
          className="max-md:hidden"
          onClick={onChangeEditorType}
        >
          Show rich text editor
        </Button>
        <Button
          size="icon"
          variant="ghost"
          type="button"
          className="md:hidden"
          onClick={onChangeEditorType}
          aria-label="Show rich text editor"
        >
          <IoDocumentText />
        </Button>
      </div>
      <TextareaAutosize
        id={id}
        autoFocus={autoFocus}
        defaultValue={content}
        onChange={(e) => onChange(e.target.value)}
        className="markdown-content resize-none w-full max-w-full font-mono outline-none py-2 px-3 md:px-3.5 grow shrink-0 basis-auto"
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (onSubmit && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div
        className={cn(
          "flex flex-row justify-end px-2 py-1 sticky bottom-0 md:hidden",
          hideMenu && "hidden",
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Button
          size="sm"
          variant="ghost"
          type="button"
          className="max-md:hidden"
          onClick={onChangeEditorType}
        >
          Show rich text editor
        </Button>
        <Button
          size="icon"
          variant="ghost"
          type="button"
          className="md:hidden"
          onClick={onChangeEditorType}
          aria-label="Show rich text editor"
        >
          <IoDocumentText />
        </Button>
      </div>
    </>
  );
}

export function MarkdownEditor({
  content,
  onChange,
  className,
  autoFocus: autoFocusDefault,
  placeholder,
  onFocus,
  onBlur,
  onChageEditorType,
  onSubmit,
  footer,
  id,
  hideMenu,
}: {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onChageEditorType?: () => void;
  onSubmit?: () => void;
  footer?: React.ReactNode;
  id?: string;
  hideMenu?: boolean;
}) {
  const [autoFocus, setAutoFocus] = useState(autoFocusDefault ?? false);
  const showMarkdown = useSettingsStore((s) => s.showMarkdown);
  const setShowMarkdown = useSettingsStore((s) => s.setShowMarkdown);

  return (
    <div className={cn("flex flex-col", className)}>
      {showMarkdown ? (
        <TextAreaEditor
          content={content}
          onChange={onChange}
          onChangeEditorType={() => {
            onChageEditorType?.();
            setAutoFocus(true);
            setShowMarkdown(false);
          }}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onFocus={onFocus}
          onSubmit={onSubmit}
          onBlur={onBlur}
          id={id}
          hideMenu={hideMenu}
        />
      ) : (
        <TipTapEditor
          content={content}
          onChange={onChange}
          onChangeEditorType={() => {
            onChageEditorType?.();
            setAutoFocus(true);
            setShowMarkdown(true);
          }}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onFocus={onFocus}
          onSubmit={onSubmit}
          onBlur={onBlur}
          id={id}
          hideMenu={hideMenu}
        />
      )}
      {footer}
    </div>
  );
}
