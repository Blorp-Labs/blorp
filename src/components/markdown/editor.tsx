import {
  Editor,
  EditorContent,
  getMarkRange,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import {
  DetailsWithMarkdown,
  DetailsContentWithMarkdown,
  DetailsSummaryWithMarkdown,
} from "./editor-extensions/spoiler-plugin";
import SubScript from "./editor-extensions/subscript";
import SupScript from "./editor-extensions/supscript";
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
import {
  IoLogoMarkdown,
  IoDocumentText,
  IoLink,
  IoEllipsisHorizontal,
} from "react-icons/io5";
import { useUploadImage } from "@/src/lib/api";
import { LuImageUp } from "react-icons/lu";
import _ from "lodash";
import { useIonAlert } from "@ionic/react";
import { Deferred } from "@/src/lib/deferred";
import z from "zod";
import { ActionMenu } from "../adaptable/action-menu";
import { MdOutlineFormatClear } from "react-icons/md";
import Mention from "@tiptap/extension-mention";
import { useMentionSuggestions } from "./editor-extensions/mention";

/** Strip trailing &nbsp; markers that @tiptap/extension-paragraph emits for empty paragraphs */
function stripTrailingNbsp(md: string): string {
  let result = md.replace(/(\n\n&nbsp;)+$/, "");
  if (result === "&nbsp;") result = "";
  return result;
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
  if (!range) return null;

  const text = state.doc.textBetween(range.from, range.to, undefined, "\uFFFC");
  const attrs = editor.getAttributes("link"); // href, target, etc.
  return { text, href: attrs["href"], range };
}

function useRenderOnTipTapChange(editor: Editor | null) {
  const [, setSignal] = useState(0);
  useEffect(() => {
    if (!editor) return;
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
              const { from } = editor.state.selection;
              const to = from + description.length;
              editor
                .chain()
                .focus()
                .insertContent(description)
                .setTextSelection({ from, to })
                .setLink({ href: url })
                .setTextSelection({ from: to, to })
                .run();
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

      <ActionMenu
        actions={[
          {
            text: "Horizontal Line",
            onClick: () => editor.chain().focus().setHorizontalRule().run(),
          },
          {
            text: "Code",
            onClick: () => editor.chain().focus().toggleCodeBlock().run(),
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
            text: "Unordered List",
            onClick: () => editor.chain().focus().toggleBulletList().run(),
          },
          {
            text: "Ordered List",
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
          },
          {
            text: "Subscript",
            onClick: () => editor.chain().focus().toggleMark("subscript").run(),
          },
          {
            text: "Superscript",
            onClick: () => editor.chain().focus().toggleMark("supscript").run(),
          },
        ]}
        trigger={
          <IoEllipsisHorizontal
            className="text-muted-foreground"
            aria-label="More text formatting options"
          />
        }
      />
    </div>
  );
};

function TipTapEditor({
  autoFocus,
  content,
  onChange,
  onChangeEditorType,
  placeholder,
  onFocus,
  onBlur,
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
  id?: string;
  hideMenu?: boolean;
}) {
  const uploadImage = useUploadImage();

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
    extensions: [
      Markdown,
      Placeholder.configure({
        placeholder,
      }),
      StarterKit.configure({
        codeBlock: false,
      }),
      Image,
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockEditor);
        },
      }).configure({
        lowlight,
      }),
      CustomLink.configure({
        autolink: true,
        defaultProtocol: "https",
      }),
      TableKit.configure({
        table: { resizable: true },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestions: mentionSuggestions,
      }),
      SubScript,
      SupScript,
      DetailsWithMarkdown.configure({
        HTMLAttributes: {
          class: "details",
        },
      }),
      DetailsSummaryWithMarkdown,
      DetailsContentWithMarkdown,
    ],
    onUpdate: ({ editor }) => {
      onChange(stripTrailingNbsp(editor.getMarkdown()));
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
      handlePaste: (view, event) => {
        if (event.clipboardData && event.clipboardData.files.length > 0) {
          for (const file of Array.from(event.clipboardData?.files ?? [])) {
            handleFile(file).then(({ url }) => {
              const { schema, tr, selection } = view.state;
              const { from } = selection;

              if (schema.nodes["image"]) {
                const node = schema.nodes["image"].create({ src: url }); // create image node
                const transaction = tr.insert(from, node); // insert at current selection
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
              if (schema.nodes["image"]) {
                const node = schema.nodes["image"].create({ src: url }); // creates the image element
                const transaction = view.state.tr.insert(
                  coordinates?.pos ?? 0,
                  node,
                ); // places it in the correct position
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
    if (stripTrailingNbsp(editor.getMarkdown()) !== content) {
      editor.commands.setContent(content, { contentType: "markdown" });
    }
  }, [content, editor]);

  return (
    <>
      <div
        className={cn(
          "flex flex-row justify-between py-1.5 px-2 pb-0 max-md:hidden",
          hideMenu && "hidden",
        )}
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
                    .setImage({ src: url })
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
                    .setImage({ src: url })
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
      />
      <div
        className={cn(
          "flex flex-row justify-end px-2 py-1 sticky bottom-0 md:hidden",
          hideMenu && "hidden",
        )}
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
  onChageEditorType,
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
  onChageEditorType?: () => void;
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
          id={id}
          hideMenu={hideMenu}
        />
      )}
      {footer}
    </div>
  );
}
