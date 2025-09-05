import {
  createContext,
  FormEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import {
  useCaptcha,
  useInstances,
  useLogin,
  useRefreshAuth,
  useRegister,
  useSite,
} from "../lib/api";
import fuzzysort from "fuzzysort";
import _ from "lodash";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { VirtualList } from "./virtual-list";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./ui/input-otp";
import { LuLoaderCircle } from "react-icons/lu";
import { FaPlay, FaPause } from "react-icons/fa";
import { MdOutlineRefresh } from "react-icons/md";
import { Textarea } from "./ui/textarea";
import { MarkdownRenderer } from "./markdown/renderer";
import { env, getDefaultInstace } from "../env";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { normalizeInstance } from "../lib/utils";
import { ToolbarButtons } from "./toolbar/toolbar-buttons";

const AudioPlayButton = ({ src }: { src: string }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(new Audio(`data:audio/wav;base64,${src}`));

  useEffect(() => {
    const start = () => setPlaying(true);
    const stop = () => setPlaying(false);

    const current = audioRef.current;

    current.addEventListener("play", start);
    current.addEventListener("ended", stop);
    current.addEventListener("pause", stop);

    return () => {
      current.removeEventListener("play", start);
      current.removeEventListener("ended", stop);
      current.removeEventListener("pause", stop);
    };
  }, []);

  const handlePlay = () => {
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.play();
    }
  };

  return (
    <button type="button" onClick={handlePlay}>
      {playing ? <FaPause /> : <FaPlay />}
    </button>
  );
};

const Context = createContext<{
  authenticate: (config?: { addAccount?: boolean }) => Promise<void>;
}>({
  authenticate: () => Promise.reject(),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const refresh = useRefreshAuth();

  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));

  const [promise, setPromise] = useState<{
    resolve: (value: void) => any;
    reject: () => any;
    addAccount?: boolean;
  }>();

  useEffect(() => {
    if (isLoggedIn && !promise?.addAccount) {
      promise?.resolve();
    }
  }, [isLoggedIn, promise]);

  const authenticate = useCallback(
    (config?: { addAccount?: boolean }) => {
      const addAccount = config?.addAccount === true;

      if (isLoggedIn && !addAccount) {
        return Promise.resolve();
      }

      const p = new Promise<void>((resolve, reject) => {
        setPromise({ resolve, reject, addAccount });
      });

      p.then(() => setPromise(undefined)).catch(() => setPromise(undefined));

      return p;
    },
    [isLoggedIn],
  );

  useEffect(() => {
    if (refresh.isSuccess && !isLoggedIn && site?.privateInstance) {
      authenticate();
    }
  }, [refresh.isSuccess, isLoggedIn, site, authenticate]);

  return (
    <Context.Provider
      value={{
        authenticate,
      }}
    >
      {children}
      <AuthModal
        open={promise !== undefined}
        onClose={() => promise?.reject()}
        onSuccess={() => promise?.resolve()}
        addAccount={promise?.addAccount === true}
      />
    </Context.Provider>
  );
}

export function useRequireAuth() {
  return useContext(Context).authenticate;
}

function SignupForm({
  onSuccess,
  onCancel,
  instance,
  addAccount,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  instance?: string;
  addAccount: boolean;
}) {
  instance ??= getDefaultInstace();

  const captcha = useCaptcha({
    instance,
  });

  const [email, setEmail] = useState("");
  const [userName, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [answer, setAnswer] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const register = useRegister({
    addAccount,
    instance,
  });

  const site = useSite({
    instance,
  });

  const submitLogin = (e?: FormEvent) => {
    e?.preventDefault();
    register
      .mutateAsync({
        email: email || undefined,
        username: userName,
        password: password,
        repeatPassword: verifyPassword,
        captchaUuid: captcha.data?.uuid,
        captchaAnswer: captchaAnswer,
        answer,
      })
      .then(() => {
        onSuccess();
        setEmail("");
        setUsername("");
        setPassword("");
        setVerifyPassword("");
        setAnswer("");
        setCaptchaAnswer("");
      });
  };

  const applicationQuestion = site.data?.applicationQuestion;

  if (site.data?.registrationMode === "Closed") {
    return (
      <div className="gap-4 flex flex-col p-4">
        <div className="bg-destructive/20 p-1 rounded-md text-center">
          This instance is not currently accepting registrations
        </div>
        <Button variant="ghost" onClick={() => onCancel()}>
          Return to login
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitLogin}
      className="gap-4 flex flex-col p-4"
      data-testid="signup-form"
    >
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-sm">Email</label>
        <Input
          placeholder="Email"
          id="email"
          defaultValue={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-sm" htmlFor="username">
          Username
        </label>
        <Input
          placeholder="Username"
          id="username"
          defaultValue={userName}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-sm" htmlFor="password">
          Password
        </label>
        <Input
          placeholder="Enter password"
          type="password"
          id="password"
          defaultValue={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-sm">Verify Password</label>
        <Input
          placeholder="Verify password"
          type="password"
          id="password"
          defaultValue={verifyPassword}
          onChange={(e) => setVerifyPassword(e.target.value)}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>

      {captcha.isPending && <LuLoaderCircle className="animate-spin" />}

      {captcha.data && (
        <div className="flex flex-row gap-4">
          <div className="flex flex-col justify-around items-center p-2">
            <button onClick={() => captcha.refetch()} type="button">
              <MdOutlineRefresh size={24} />
            </button>

            <AudioPlayButton src={captcha.data?.audioUrl} />
          </div>

          <img
            src={`data:image/png;base64,${captcha.data?.imgUrl}`}
            className="h-28 aspect-video object-contain"
          />

          <Input
            className="self-center"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
          />
        </div>
      )}

      {applicationQuestion && (
        <MarkdownRenderer markdown={applicationQuestion} />
      )}

      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        required
      />

      <Button type="submit" className="mx-auto">
        Sign up
        {register.isPending && <LuLoaderCircle className="animate-spin" />}
      </Button>

      <span className="mx-auto text-muted-foreground text-sm">
        By signing up you agree to{" "}
        <a
          className="underline"
          href="https://blorpblorp.xyz/terms"
          target="_blank"
          rel="noreferrer noopener"
        >
          {env.REACT_APP_NAME}'s terms
        </a>
      </span>
    </form>
  );
}

const DEFAULT_INSTACE = {
  url: getDefaultInstace(),
  baseurl: new URL(getDefaultInstace()).host,
};

function AuthModal({
  open,
  onClose,
  onSuccess,
  addAccount,
}: {
  open: boolean;
  onClose: () => any;
  onSuccess: () => any;
  addAccount: boolean;
}) {
  const [signup, setSignup] = useState(false);

  const [search, setSearch] = useState("");
  const [_instance, _setInstanceLocal] = useState<{
    url?: string;
    baseurl?: string;
  }>({});
  const setInstanceLocal = (url?: string) => {
    if (!url) {
      _setInstanceLocal({});
      return;
    }
    let baseurl: string | undefined = undefined;
    try {
      baseurl = new URL(url).host;
    } catch {}
    _setInstanceLocal({
      url,
      baseurl,
    });
  };
  const instance = env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE
    ? DEFAULT_INSTACE
    : _instance;

  const [userName, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string>();
  const login = useLogin({
    addAccount,
    instance: instance.url,
  });

  const instances = useInstances();

  const [software, setSoftware] = useState<"lemmy" | "piefed">("lemmy");

  const site = useSite({
    instance: instance.baseurl ?? search,
  });

  const data = useMemo(() => {
    const output = [...(instances.data ?? [])];
    if (site.data) {
      try {
        const url = normalizeInstance(site.data.instance);
        const baseUrl = new URL(url).host;
        output.push({
          baseUrl,
          url,
          score: Infinity,
          software: "",
        });
      } catch {}
    }
    return _.uniqBy(output, ({ baseUrl }) => baseUrl).filter(
      (item) => !item.software || item.software === software,
    );
  }, [instances.data, site.data, software]);

  const sortedInstances =
    search && data
      ? fuzzysort
          .go(search, data, {
            keys: ["url", "name"],
            scoreFn: (r) => r.score * _.clamp(r.obj.score, 1, 10),
          })
          .map((r) => r.obj)
      : data;

  const updateSelectedAccount = useAuth((a) => a.updateSelectedAccount);
  const addAccountFn = useAuth((a) => a.addAccount);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setMfaToken(undefined);
    setInstanceLocal();
    setSearch("");
  };

  const submitLogin = (e?: FormEvent) => {
    e?.preventDefault();
    login
      .mutateAsync({
        username: userName,
        password: password,
        mfaCode: mfaToken,
      })
      .then(() => {
        onSuccess();
        resetForm();
      });
  };

  useEffect(() => {
    if (mfaToken && mfaToken.length === 6) {
      submitLogin();
    }
  }, [mfaToken]);

  const modal = useRef<HTMLIonModalElement>(null);

  return (
    <IonModal
      isOpen={open}
      onDidDismiss={onClose}
      ref={modal}
      data-testid="auth-modal"
    >
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <IonButton
              onClick={() => {
                if (instance.url && !env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE) {
                  setSignup(false);
                  setInstanceLocal();
                } else {
                  modal.current?.dismiss();
                }
              }}
            >
              {instance.baseurl && !env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE
                ? "Back"
                : "Close"}
            </IonButton>
          </ToolbarButtons>
          <IonTitle>{instance.baseurl ? instance.baseurl : "Login"}</IonTitle>
          {software === "lemmy" && (
            <ToolbarButtons side="right">
              <IonButton
                onClick={() => {
                  setSignup((b) => !b);
                }}
              >
                {signup ? "Login" : "Sign up"}
              </IonButton>
            </ToolbarButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {signup && (
          <SignupForm
            instance={instance.url}
            onSuccess={() => {
              onSuccess();
              resetForm();
            }}
            onCancel={() => setSignup(false)}
            addAccount={addAccount}
          />
        )}

        {!signup && !instance.url && (
          <div className="flex flex-col h-full">
            <VirtualList
              className="px-4"
              estimatedItemSize={50}
              stickyHeaderIndices={[0]}
              data={sortedInstances}
              header={[
                <div
                  className="bg-background py-3 border-b-[.5px]"
                  key="search-instance"
                >
                  <IonHeader className="mb-2">
                    Pick the server you created your account on
                  </IonHeader>
                  <Input
                    placeholder="Search for your server or enter one thats not in the list"
                    defaultValue={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="mb-3"
                  />
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={software}
                    onValueChange={(val) =>
                      val && setSoftware(val as "lemmy" | "piefed")
                    }
                  >
                    <ToggleGroupItem value="lemmy">Lemmy</ToggleGroupItem>
                    <ToggleGroupItem value="piefed">PieFed</ToggleGroupItem>
                  </ToggleGroup>
                </div>,
              ]}
              renderItem={({ item: i }) => (
                <button
                  key={i.url}
                  onClick={() => {
                    setInstanceLocal(i.url);
                  }}
                  className="py-2.5 text-lg border-b-[.5px] w-full text-start"
                >
                  <span>{i.baseUrl}</span>
                </button>
              )}
            />
          </div>
        )}

        {!signup && !!instance.url && (
          <>
            <form
              onSubmit={submitLogin}
              className="gap-4 flex flex-col p-4"
              data-testid="login-form"
            >
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-sm">
                  Username
                </label>
                <Input
                  placeholder="Username"
                  id="username"
                  defaultValue={userName}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-sm">
                  Password
                </label>
                <Input
                  placeholder="Enter password"
                  type="password"
                  id="password"
                  defaultValue={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>

              {(login.needsMfa || _.isString(mfaToken)) && (
                <InputOTP
                  data-testid="otp-input"
                  maxLength={6}
                  defaultValue={mfaToken}
                  onChange={(newVal) => setMfaToken(newVal)}
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              )}

              <Button type="submit" className="mx-auto">
                Sign In
                {login.isPending && <LuLoaderCircle className="animate-spin" />}
              </Button>

              {software === "lemmy" && (
                <span className="mx-auto">
                  Need an account?
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setSignup(true)}
                  >
                    Sign up
                  </Button>
                </span>
              )}

              {site.data?.privateInstance === false && (
                <Button
                  type="button"
                  className="mx-auto"
                  variant="ghost"
                  onClick={() => {
                    if (addAccount) {
                      addAccountFn({
                        instance: instance.url,
                      });
                    } else {
                      updateSelectedAccount({
                        instance: instance.url,
                      });
                    }
                    setInstanceLocal();
                    onClose();
                  }}
                >
                  Continue as Guest
                </Button>
              )}

              <span className="mx-auto text-muted-foreground text-sm">
                By logging in you agree to{" "}
                <a
                  className="underline"
                  href="https://blorpblorp.xyz/terms"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {env.REACT_APP_NAME}'s terms
                </a>
              </span>
            </form>
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
