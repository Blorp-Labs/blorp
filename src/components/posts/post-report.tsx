import { createContext, useContext, useMemo, useState } from "react";
import _ from "lodash";
import { usePostsStore } from "@/src/stores/posts";
import { useCreatePostReport, useCreateCommentReport } from "@/src/lib/api";
import { useCommentsStore } from "@/src/stores/comments";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { Button } from "../ui/button";
import { MarkdownRenderer } from "../markdown/renderer";
import { Textarea } from "../ui/textarea";
import { useAuth } from "@/src/stores/auth";
import { ToolbarButtons } from "../toolbar/toolbar-buttons";

const Context = createContext<{
  apId?: string;
  setApId: (postId: string) => any;
  commentPath?: string;
  setCommentPath: (path: string) => any;
}>({
  setApId: _.noop,
  setCommentPath: _.noop,
});

export function PostReportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reason, setReason] = useState("");
  const [apId, setApId] = useState<string | undefined>();
  const [commentPath, setCommentPath] = useState<string | undefined>();

  const createPostReport = useCreatePostReport();
  const createCommentReport = useCreateCommentReport();

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore((s) =>
    apId ? s.posts[getCachePrefixer()(apId)]?.data : null,
  );
  const comment = useCommentsStore((s) =>
    commentPath ? s.comments[getCachePrefixer()(commentPath)] : null,
  );

  const value = useMemo(
    () => ({
      apId,
      setApId,
      commentPath,
      setCommentPath,
    }),
    [apId, commentPath],
  );

  const submit = () => {
    if (post) {
      createPostReport
        .mutateAsync({
          postId: post.id,
          reason,
        })
        .then(() => {
          setReason("");
          setApId(undefined);
        });
    } else if (comment) {
      createCommentReport
        .mutateAsync({
          commentId: comment.data.id,
          reason,
        })
        .then(() => {
          setReason("");
          setCommentPath(undefined);
        });
    }
  };

  const cancel = () => {
    setApId(undefined);
    setCommentPath(undefined);
  };

  return (
    <Context.Provider value={value}>
      <IonModal
        isOpen={!!post || !!commentPath}
        onDidDismiss={() => {
          setApId(undefined);
          setCommentPath(undefined);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <ToolbarButtons side="left" className="md:hidden">
              <IonButton onClick={cancel}>Cancel</IonButton>
            </ToolbarButtons>
            <IonTitle>
              Report {post && "Post"}
              {comment && "Comment"}
            </IonTitle>
            <ToolbarButtons side="right" className="md:hidden">
              <IonButton onClick={submit}>Submit</IonButton>
            </ToolbarButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <form
            className="h-full"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="p-3 h-full flex flex-col gap-3">
              <div className="p-3 bg-secondary rounded-lg max-h-[250px] overflow-auto">
                {post && <span className="font-bold">{post?.title}</span>}

                {comment && <MarkdownRenderer markdown={comment.data.body} />}
              </div>

              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Report reason"
                className="flex-1 min-h-[200px]"
              />

              <div className="flex flex-row gap-3 justify-end max-md:hidden">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancel}
                  type="button"
                >
                  Cancel
                </Button>

                <Button>Submit</Button>
              </div>
            </div>
          </form>
        </IonContent>
      </IonModal>
      {children}
    </Context.Provider>
  );
}

export function useShowPostReportModal() {
  return useContext(Context).setApId;
}

export function useShowCommentReportModal() {
  return useContext(Context).setCommentPath;
}
