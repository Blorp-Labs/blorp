import {
  Editor,
  EditorContent,
  getMarkRange,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Spoiler from "./spoiler-plugin";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { toast } from "sonner";
import { MdOutlineFormatClear } from "react-icons/md";
import Mention from "@tiptap/extension-mention";
import { useMentionSuggestions } from "./editor-extensions/mention";

const CustomLink = Link.extend({
  inclusive: false,
});

const linkSchema = z.object({
  description: z.string(),
  url: z.string(),
});

function IconFileInput({ onFile }: { onFile: (file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
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

const MenuBar = ({
  editor,
  onFile,
  className,
}: {
  editor: Editor | null;
  onFile: (file: File) => void;
  className?: string;
}) => {
  const [alrt] = useIonAlert();

  if (!editor) {
    return null;
  }
  return (
    <div className={cn("flex flex-row items-center gap-1.5", className)}>
      <IconFileInput onFile={onFile} />

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
                  placeholder: "Desscription",
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
            } else if (isLinkActive) {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .insertContent([
                  {
                    type: "text",
                    text: description,
                    marks: [{ type: "link", attrs: { href: url } }],
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
        disabled={!editor.can().chain().focus().toggleBold().run()}
        aria-label={editor.isActive("bold") ? "Unbold" : "Bold"}
      >
        <AiOutlineBold />
      </Toggle>

      <Toggle
        size="icon"
        data-state={editor.isActive("italic") ? "on" : "off"}
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        aria-label={editor.isActive("italic") ? "Unitalicize" : "Italicize"}
      >
        <AiOutlineItalic />
      </Toggle>

      <Toggle
        size="icon"
        data-state={editor.isActive("strike") ? "on" : "off"}
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
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
        disabled={!editor.can().chain().focus().toggleBlockquote().run()}
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
              // @ts-expect-error
              editor.commands.insertSpoiler();
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
    autofocus: autoFocus,
    content,
    extensions: [
      Placeholder.configure({
        placeholder,
      }),
      StarterKit.configure({
        codeBlock: false,
      }),
      Image,
      Markdown,
      Spoiler,
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
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestions: mentionSuggestions,
      }),
    ],
    onUpdate: ({ editor }) => {
      const markdown = editor?.storage["markdown"].getMarkdown();
      onChange(markdown);
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
      handleDrop: (view, event, slice, moved) => {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file.type === "image/jpeg" || file.type === "image/png") {
            handleFile(file)
              .then(({ url }) => {
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
              })
              .catch((err) => {
                if (err instanceof Error) {
                  toast.error(err.message);
                } else {
                  toast.error("Failed to upload image");
                }
              });
          }
          return true; // handled
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor?.storage["markdown"].getMarkdown() !== content) {
      editor?.commands.setContent(content);
    }
  }, [content]);

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
          onFile={(file) =>
            handleFile(file)
              .then(({ url }) => {
                if (url) {
                  editor?.chain().focus().setImage({ src: url }).run();
                }
              })
              .catch((err) => {
                if (err instanceof Error) {
                  toast.error(err.message);
                } else {
                  toast.error("Failed to upload image");
                }
              })
          }
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
          onFile={(file) =>
            handleFile(file)
              .then(({ url }) => {
                if (url) {
                  editor?.chain().focus().setImage({ src: url }).run();
                }
              })
              .catch((err) => {
                if (err instanceof Error) {
                  toast.error(err.message);
                } else {
                  toast.error("Failed to upload image");
                }
              })
          }
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
