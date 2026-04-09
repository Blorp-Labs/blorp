import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import {
  useCaptchaQuery,
  useInstancesQuery,
  useLoginMutation,
  useRefreshAuthQuery,
  useRegisterMutation,
  useSiteQuery,
} from "../queries";
import fuzzysort from "fuzzysort";
import _ from "lodash";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonToolbar,
} from "@ionic/react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../components/ui/input-otp";
import { LuLoaderCircle } from "react-icons/lu";
import { FaPlay, FaPause } from "react-icons/fa";
import { MdOutlineRefresh } from "react-icons/md";
import { Textarea } from "../components/ui/textarea";
import { MarkdownRenderer } from "../components/markdown/renderer";
import { env } from "../env";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { cn } from "../lib/utils";
import { normalizeInstance } from "../normalize-instance";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Software } from "../apis/api-blueprint";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { ChevronLeft, Spinner, X } from "@/src/components/icons";
import { AuthContext } from "../hooks/use-require-auth";
import { Field, FieldLabel } from "../components/ui/field";
import { useQueryToast } from "../hooks/use-query-toast";
import { getFirstZodIssue } from "../lib/zod";

function LegalNotice({ instance }: { instance: SelectedInstance }) {
  return (
    <span className="mx-auto text-muted-foreground text-sm text-center">
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
        {/* TODO: Render @instance instead of full url */}
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
    audioRef.current.pause();
    audioRef.current.src = `data:audio/wav;base64,${src}`;
    audioRef.current.load();
    setPlaying(false);
  }, [src]);

  useEffect(() => {
    const start = () => setPlaying(true);
    const stop = () => setPlaying(false);

    const audio = audioRef.current;

    audio.addEventListener("play", start);
    audio.addEventListener("ended", stop);
    audio.addEventListener("pause", stop);

    return () => {
      audio.removeEventListener("play", start);
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("pause", stop);
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
    <Button size="icon" variant="outline" type="button" onClick={handlePlay}>
      {playing ? <FaPause /> : <FaPlay />}
    </Button>
  );
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const refresh = useRefreshAuthQuery();

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
    <AuthContext.Provider
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
    </AuthContext.Provider>
  );
}

function useAuthSite({
  instance,
  search,
}: {
  search?: string;
  instance: SelectedInstance;
}) {
  return useSiteQuery({
    instance: search || instance.baseurl || env.defaultInstance,
  });
}

function InstanceSelectionPage({
  instance,
  setInstance,
}: {
  instance: SelectedInstance;
  setInstance: (newInstance: string) => void;
}) {
  const [software, setSoftware] = useState<Software | "all">("all");

  const [search, setSearch] = useState("");
  const searchUrl = useMemo(() => {
    try {
      return normalizeInstance(search);
    } catch {
      return null;
    }
  }, [search]);

  const instances = useInstancesQuery();

  const site = useSiteQuery(
    {
      instance: searchUrl ?? instance.baseurl,
    },
    {
      retry: false,
    },
  );

  useQueryToast(site, {
    error: getFirstZodIssue(site.error)?.message,
  });

  const data = useMemo(() => {
    const output = [...(instances.data ?? [])];
    if (site.data) {
      try {
        const url = normalizeInstance(site.data.site.instance);
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
      (item) =>
        software === "all" || !item.software || item.software === software,
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
    return { lemmy, piefed, all: _.sum(_.compact([lemmy, piefed])) };
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
        <div className="relative mb-3">
          <Input
            placeholder="Search for your instance OR enter a url thats not in the list"
            defaultValue={search}
            onChange={(e) => setSearch(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            endAdornment={
              site.isPending && <Spinner className="text-2xl animate-spin" />
            }
          />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={software ?? "all"}
          onValueChange={(val) => val && setSoftware(val as Software)}
        >
          <ToggleGroupItem value="all" data-testid="auth-filter-all">
            All ({counts.all})
          </ToggleGroupItem>
          <ToggleGroupItem value="lemmy" data-testid="auth-filter-lemmy">
            Lemmy ({counts.lemmy})
          </ToggleGroupItem>
          <ToggleGroupItem value="piefed" data-testid="auth-filter-piefed">
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

  const login = useLoginMutation({
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
      className="gap-4 flex flex-col p-6 overflow-y-auto ion-content-scroll-host h-full overflow-x-hidden"
      data-testid="login-form"
    >
      <div className="flex flex-col gap-5">
        <span className="text-2xl font-bold">Login to {instance.baseurl}</span>

        <p>
          Login with your <b>{instance.baseurl}</b> credentials. If your account
          is hosted on a different server, you must change instance before
          loggin in.
        </p>

        <Field>
          <FieldLabel required>Username</FieldLabel>
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
        </Field>

        <Field>
          <FieldLabel required>Password</FieldLabel>
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
        </Field>

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

        <Button type="submit" className="">
          Sign In
          {login.isPending && <LuLoaderCircle className="animate-spin" />}
        </Button>

        <span className="mx-auto">
          <Button type="button" variant="link" onClick={handleSignup}>
            Sign up
          </Button>

          {site.data?.site.privateInstance === false && (
            <Button
              type="button"
              className="mx-auto"
              variant="link"
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
        </span>

        <LegalNotice instance={instance} />
      </div>
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
  const captcha = useCaptchaQuery({
    instance: instance.url,
  });

  const [email, setEmail] = useState("");
  const [userName, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [answer, setAnswer] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const register = useRegisterMutation({
    addAccount,
    instance: instance.url,
  });

  const site = useSiteQuery({
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

  const applicationQuestion = site.data?.site.applicationQuestion;

  return (
    <div className="p-6 overflow-y-auto ion-content-scroll-host h-full">
      {site.data?.site.software === "piefed" && (
        <div className="bg-destructive text-background p-1 rounded-md text-center mb-4 sticky top-0">
          PieFed doesn't yet support registrations through 3rd party clients
          like Blorp
        </div>
      )}

      {site.data?.site.registrationMode === "Closed" && (
        <div className="bg-destructive text-background p-1 rounded-md text-center mb-4 sticky top-0">
          This instance is not currently accepting registrations
        </div>
      )}

      <form
        onSubmit={submitLogin}
        className="gap-5 flex flex-col"
        data-testid="signup-form"
      >
        <span className="text-2xl font-bold">
          Let's get you set up on {instance.baseurl}.
        </span>

        <p>
          With an account on this server, you'll be able to follow any other
          person on the fediverse, regardless of where their account is hosted.
        </p>

        <Field>
          <FieldLabel required htmlFor="email">
            Email
          </FieldLabel>
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
        </Field>

        <Field>
          <FieldLabel required htmlFor="username">
            Username
          </FieldLabel>
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
        </Field>

        <Field>
          <FieldLabel required htmlFor="password">
            Password
          </FieldLabel>
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
          <Input
            wrapperClassName="mt-1"
            placeholder="Confirm password"
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
        </Field>

        {captcha.isPending && <LuLoaderCircle className="animate-spin" />}

        {captcha.data && (
          <Field className="bg-secondary p-3 rounded-md flex flex-row gap-4 justify-between">
            <div className="flex flex-col justify-between">
              <FieldLabel required htmlFor="captcha">
                Captcha
              </FieldLabel>
              <Input
                id="captcha"
                wrapperClassName="bg-background"
                className="self-center"
                placeholder="Captcha answer"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
              />
            </div>

            <div className="flex flex-col justify-around items-center p-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => captcha.refetch()}
                type="button"
              >
                <MdOutlineRefresh size={24} />
              </Button>

              <AudioPlayButton src={captcha.data?.audioUrl} />
            </div>

            <img
              src={`data:image/png;base64,${captcha.data?.imgUrl}`}
              className="h-28 aspect-video object-contain"
            />
          </Field>
        )}

        {applicationQuestion && (
          <>
            <div className="bg-amber-100 text-amber-800 border-amber-800 border p-2 rounded-md">
              To join this server, you need to fill out the application below,
              and wait to be accepted.
            </div>
            <MarkdownRenderer markdown={applicationQuestion} />
          </>
        )}

        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
          placeholder="Application answer"
        />

        <Button type="submit">
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

const INIT_STEP = "login";

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
              className="size-5"
              data-testid={
                step !== "instance-selection"
                  ? "auth-change-instance"
                  : "auth-close"
              }
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
              !env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE ? (
                <ChevronLeft
                  className="-ml-1"
                  aria-label="Back to instance selection"
                />
              ) : (
                <X className="-ml-1 scale-150" aria-label="Close auth modal" />
              )}
            </IonButton>
            <ToolbarTitle numRightIcons={0}>
              {step === "instance-selection"
                ? "Chose an instance"
                : "Change instance"}
            </ToolbarTitle>
          </ToolbarButtons>
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
