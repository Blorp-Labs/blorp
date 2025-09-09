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
import { env } from "../env";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { cn, normalizeInstance } from "../lib/utils";
import { ToolbarButtons } from "./toolbar/toolbar-buttons";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Software } from "../lib/api/adapters/api-blueprint";

function LegalNotice({ instance }: { instance: SelectedInstance }) {
  return (
    <span className="mx-auto text-muted-foreground text-sm">
      By signing up you agree to {instance.baseurl} and{" "}
      <a
        className="underline"
        href="https://blorpblorp.xyz/terms"
        target="_blank"
        rel="noreferrer noopener"
      >
        {env.REACT_APP_NAME}'s
      </a>{" "}
      terms
    </span>
  );
}

function InstanceSelect({
  instance,
  setInstance,
}: {
  instance: SelectedInstance;
  setInstance: (val: string) => void;
}) {
  if (
    !env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE ||
    env.defaultInstances.length <= 1
  ) {
    return null;
  }

  return (
    <Select value={instance.url} onValueChange={(val) => setInstance(val)}>
      <SelectTrigger className="w-64">
        <SelectValue>@{instance.baseurl}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {env.defaultInstances.map((i) => (
          <SelectItem key={i} value={i}>
            {i}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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

function useAuthSite({
  instance,
  search,
}: {
  search?: string;
  instance: SelectedInstance;
}) {
  return useSite({
    instance: search || instance.baseurl || env.defaultInstance,
  });
}

function InstanceSelectionPage({
  instance,
  setInstance,
  software,
  setSoftware,
}: {
  instance: SelectedInstance;
  setInstance: (newInstance: string) => void;
  software: Software;
  setSoftware: (software: Software) => void;
}) {
  const [search, setSearch] = useState("");
  const searchUrl = useMemo(() => {
    try {
      return normalizeInstance(search);
    } catch {
      return null;
    }
  }, [search]);

  const instances = useInstances();

  const site = useSite({
    instance: searchUrl ?? instance.baseurl,
  });

  const data = useMemo(() => {
    const output = [...(instances.data ?? [])];
    if (site.data) {
      try {
        const url = normalizeInstance(site.data.instance);
        const host = new URL(url).host;
        output.push({
          host,
          url,
          software: undefined,
          description: undefined,
          icon: undefined,
        });
      } catch {}
    }
    return _.uniqBy(output, ({ host }) => host).filter(
      (item) => !item.software || item.software === software,
    );
  }, [instances.data, site.data, software]);

  const counts = useMemo(() => {
    const lemmy = instances.data?.reduce(
      (acc, crnt) => acc + (crnt.software === "lemmy" ? 1 : 0),
      0,
    );
    const piefed = instances.data?.reduce(
      (acc, crnt) => acc + (crnt.software === "piefed" ? 1 : 0),
      0,
    );
    return { lemmy, piefed };
  }, [instances.data]);

  const sortedInstances =
    search && data
      ? fuzzysort
          .go(search, data, {
            keys: ["url", "name"],
          })
          .map((r) => r.obj)
      : data;

  return (
    <div
      className="px-4 pb-4 overflow-y-auto ion-content-scroll-host h-full"
      key={software}
    >
      <div className="bg-background py-3 border-b-[.5px] sticky top-0 z-10">
        <Input
          placeholder="Search for your instance OR enter one thats not in the list"
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
          onValueChange={(val) => val && setSoftware(val as Software)}
        >
          <ToggleGroupItem value="lemmy">
            Lemmy ({counts.lemmy})
          </ToggleGroupItem>
          <ToggleGroupItem value="piefed">
            PieFed ({counts.piefed})
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {sortedInstances.map((i, index) => (
        <button
          key={i.url}
          onClick={() => {
            setInstance(i.url);
          }}
          className={cn(
            "py-2.5 w-full text-start flex gap-3 border-b-[.5px]",
            index === sortedInstances.length - 1 && "border-b-0 pb-0",
          )}
        >
          <Avatar>
            <AvatarImage src={i.icon} />
            <AvatarFallback>{i.host[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span>{i.host}</span>
            <span className="text-sm text-muted-foreground">
              {i.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function LoginForm({
  instance,
  setInstance,
  addAccount,
  onSuccess,
  handleSignup,
  onClose,
}: {
  addAccount: boolean;
  instance: SelectedInstance;
  setInstance: (newInstance: string) => void;
  onSuccess: () => void;
  handleSignup: () => void;
  onClose: () => void;
}) {
  const updateSelectedAccount = useAuth((a) => a.updateSelectedAccount);
  const addAccountFn = useAuth((a) => a.addAccount);

  const [userName, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string>();

  const login = useLogin({
    addAccount,
    instance: instance.url,
  });

  const site = useAuthSite({
    instance,
  });

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setMfaToken("");
  };

  const mutateLogin = (newMfaToken = mfaToken) => {
    login
      .mutateAsync({
        username: userName,
        password: password,
        mfaCode: newMfaToken,
      })
      .then(() => {
        onSuccess();
        resetForm();
      });
  };

  const submitLogin = (e?: FormEvent) => {
    e?.preventDefault();
    mutateLogin();
  };

  return (
    <form
      onSubmit={submitLogin}
      className="gap-4 flex flex-col p-4 overflow-y-auto ion-content-scroll-host h-full"
      data-testid="login-form"
    >
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-sm">Username</label>
        <div className="flex gap-2">
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
          <InstanceSelect instance={instance} setInstance={setInstance} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-sm">Password</label>
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
          onChange={(newMfa) => {
            setMfaToken(newMfa);
            if (newMfa.length === 6) {
              mutateLogin(newMfa);
            }
          }}
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

      <span className="mx-auto">
        Need an account?
        <Button type="button" variant="link" onClick={handleSignup}>
          Sign up
        </Button>
      </span>

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
            // setInstance(null);
            onClose();
          }}
        >
          Continue as Guest
        </Button>
      )}

      <LegalNotice instance={instance} />
    </form>
  );
}

function SignupForm({
  onSuccess,
  instance,
  setInstance,
  addAccount,
}: {
  onSuccess: () => void;
  instance: SelectedInstance;
  setInstance: (val: string) => void;
  addAccount: boolean;
}) {
  const captcha = useCaptcha({
    instance: instance.url,
  });

  const [email, setEmail] = useState("");
  const [userName, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [answer, setAnswer] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const register = useRegister({
    addAccount,
    instance: instance.url,
  });

  const site = useSite({
    instance: instance.url,
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

  return (
    <div className="p-4 overflow-y-auto ion-content-scroll-host h-full">
      {site.data?.software === "piefed" && (
        <div className="bg-destructive text-background p-1 rounded-md text-center mb-4 sticky top-0">
          PieFed doesn't yet support registrations through 3rd party clients
          like Blorp
        </div>
      )}

      {site.data?.registrationMode === "Closed" && (
        <div className="bg-destructive text-background p-1 rounded-md text-center mb-4 sticky top-0">
          This instance is not currently accepting registrations
        </div>
      )}

      <form
        onSubmit={submitLogin}
        className="gap-4 flex flex-col"
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
          <div className="flex gap-2">
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
            <InstanceSelect instance={instance} setInstance={setInstance} />
          </div>
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
          <label className="text-muted-foreground text-sm">
            Verify Password
          </label>
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

        <LegalNotice instance={instance} />
      </form>
    </div>
  );
}

const DEFAULT_INSTACE = {
  url: env.defaultInstance,
  baseurl: new URL(env.defaultInstance).host,
};

type SelectedInstance = {
  url: string;
  baseurl: string;
};

function useInstanceState() {
  const [_instance, _setInstanceLocal] =
    useState<SelectedInstance>(DEFAULT_INSTACE);
  const setInstanceLocal = (url?: string) => {
    if (!url) {
      _setInstanceLocal(DEFAULT_INSTACE);
      return;
    }
    let baseurl: string | undefined = undefined;
    try {
      baseurl = new URL(url).host;
    } catch {}
    _setInstanceLocal({
      url,
      baseurl: baseurl ?? url,
    });
  };

  if (env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE) {
  }

  // const instance = env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE ? DEFAULT_INSTACE : _instance;
  return [_instance, setInstanceLocal] as const;
}

const INIT_STEP = env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE
  ? "login"
  : "instance-selection";

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
  const [step, setStep] = useState<"instance-selection" | "login" | "signup">(
    INIT_STEP,
  );

  const [instance, setInstance] = useInstanceState();
  const modal = useRef<HTMLIonModalElement>(null);

  const [software, setSoftware] = useState<Software>(
    _.sample([Software.LEMMY, Software.PIEFED]),
  );

  const resetForm = () => {
    setStep(INIT_STEP);
  };

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
                if (
                  step !== "instance-selection" &&
                  !env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE
                ) {
                  setStep("instance-selection");
                } else {
                  modal.current?.dismiss();
                }
              }}
            >
              {step !== "instance-selection" &&
              !env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE
                ? "Back"
                : "Close"}
            </IonButton>
          </ToolbarButtons>
          <IonTitle>
            {step === "instance-selection"
              ? "Chose an instance"
              : instance.baseurl}
          </IonTitle>
          {step !== "instance-selection" && (
            <ToolbarButtons side="right">
              <IonButton
                onClick={() => {
                  setStep((step) => (step === "signup" ? "login" : "signup"));
                }}
              >
                {step === "signup" ? "Have an account?" : "Need an account?"}
              </IonButton>
            </ToolbarButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent scrollY={false} key={step}>
        {step === "instance-selection" && (
          <InstanceSelectionPage
            instance={instance}
            setInstance={(val) => {
              setInstance(val);
              setStep("login");
            }}
            software={software}
            setSoftware={setSoftware}
          />
        )}

        {step === "signup" && (
          <SignupForm
            instance={instance}
            setInstance={setInstance}
            onSuccess={() => {
              onSuccess();
              resetForm();
            }}
            addAccount={addAccount}
          />
        )}

        {step === "login" && (
          <LoginForm
            instance={instance}
            setInstance={setInstance}
            addAccount={addAccount}
            onSuccess={() => {
              onSuccess();
              resetForm();
            }}
            handleSignup={() => setStep("signup")}
            onClose={onClose}
          />
        )}
      </IonContent>
    </IonModal>
  );
}
