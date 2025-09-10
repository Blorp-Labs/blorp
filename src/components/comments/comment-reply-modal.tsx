import { createContext, useContext, useId, useState } from "react";
import { useCreateComment, useEditComment } from "@/src/lib/api/index";
import _ from "lodash";
import { useMedia } from "@/src/lib/hooks/index";
import { MarkdownEditor } from "../markdown/editor";
import { useCommentRepliesStore } from "@/src/stores/comment-replies";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { Button } from "@/src/components/ui/button";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { ToolbarButtons } from "../toolbar/toolbar-buttons";

export function useCommentEditingState({
  parent,
  comment,
  postApId,
}: {
  parent?: Schemas.Comment;
  comment?: Schemas.Comment;
  postApId?: string;
}): InternalState | null {
  const { state } = useContext(Context);

  let isMe = false;
  if (comment) {
    if (comment.id === state?.comment?.id) {
      isMe = true;
    }
  } else if (parent) {
    if (parent.apId === state?.parent?.apId) {
      isMe = true;
    }
  } else if (postApId) {
    if (postApId === state?.postApId && !state.parent && !state.comment) {
      isMe = true;
    }
  }

  return isMe ? state : null;
}

export function InlineCommentReply({
  state,
  autoFocus,
}: {
  state: InternalState;
  autoFocus?: boolean;
}) {
  const media = useMedia();

  if (media.maxMd) {
    return null;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        state.submit();
      }}
      className="max-md:hidden w-full flex-1 py-2"
    >
      <div className="flex-1 border rounded-xl shadow-xs focus-within:border-ring">
        <MarkdownEditor
          content={state.content}
          onChange={(val) => state.setContent(val)}
          autoFocus={autoFocus}
          placeholder="Add a comment..."
          footer={
            <div className="flex flex-row justify-end p-1.5 pt-0 gap-2">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => state.cancel()}
              >
                Cancel
              </Button>

              <Button size="sm">
                {state.comment ? "Update" : parent ? "Reply" : "Comment"}
              </Button>
            </div>
          }
        />
      </div>
    </form>
  );
}

type State = {
  comment?: Schemas.Comment;
  postApId: string;
  queryKeyParentId?: number;
  parent?: Schemas.Comment;
};

interface InternalState extends State {
  content: string;
  setContent: (content: string) => void;
  cancel: () => void;
  submit: () => void;
}

const Context = createContext<{
  state: InternalState | null;
  setState: (state: State) => void;
}>({
  state: null,
  setState: () => console.error("THIS SHOULD NEVER BE CALLED"),
});

export function useLoadCommentIntoEditor() {
  return useContext(Context).setState;
}

export function CommentReplyProvider({
  children,
  presentingElement,
}: {
  children: React.ReactNode;
  presentingElement?: HTMLElement;
}) {
  const [signal, setSignal] = useState(0);
  const [state, setState] = useState<State | null>(null);

  const { queryKeyParentId, comment, postApId, parent } = state ?? {};

  const createComment = useCreateComment();
  const editComment = useEditComment();

  const lastResortId = useId();
  const commentKey = comment?.id ?? parent?.id ?? postApId ?? lastResortId;
  const body =
    useCommentRepliesStore((s) => s.getComment(commentKey)) ??
    comment?.body ??
    "";

  const setContent = useCommentRepliesStore((s) => s.setComment);

  const handleSubmit = () => {
    if (!body) {
      setState(null);
      return;
    }
    if (comment) {
      editComment.mutate({
        id: comment.id,
        path: comment.path,
        body: body,
      });
    } else if (_.isString(postApId)) {
      createComment.mutate({
        postApId,
        body: body,
        parentId: parent?.id,
        parentPath: parent?.path,
        queryKeyParentId,
      });
    }
    setContent(commentKey, null);
    setState(null);
    setSignal((s) => s + 1);
  };

  const onCancel = () => {
    if (body.trim() === "") {
      setContent(commentKey, null);
    }
    setState(null);
  };

  const internalState: InternalState | null = state
    ? {
        ...state,
        content: body,
        setContent: (newContent: string) => setContent(commentKey, newContent),
        cancel: () => onCancel(),
        submit: handleSubmit,
      }
    : null;

  const media = useMedia();

  return (
    <Context.Provider value={{ setState, state: internalState }}>
      <IonModal
        isOpen={state !== null}
        onWillDismiss={() => onCancel()}
        onDidPresent={() => setSignal((s) => s + 1)}
        presentingElement={presentingElement}
        className="md:hidden"
      >
        <IonHeader>
          <IonToolbar>
            <ToolbarButtons side="left">
              <IonButton onClick={() => onCancel()}>Cancel</IonButton>
            </ToolbarButtons>
            <IonTitle>{parent ? "Reply to comment" : "Add comment"}</IonTitle>
            <ToolbarButtons side="right">
              <IonButton strong={true} onClick={handleSubmit}>
                Confirm
              </IonButton>
            </ToolbarButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {media.maxMd && (
            <MarkdownEditor
              key={signal}
              content={body}
              onChange={(val) => setContent(commentKey, val)}
              className="min-h-full"
              autoFocus
              placeholder="Add a comment..."
            />
          )}
        </IonContent>
      </IonModal>
      {children}
    </Context.Provider>
  );
}
