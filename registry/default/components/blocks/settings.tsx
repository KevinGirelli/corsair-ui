"use client";

import {
  useId,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type SubmitEvent,
} from "react";

import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/registry/default/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/default/ui/avatar";
import { Button, buttonVariants } from "@/registry/default/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/registry/default/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";
import { PasswordInput } from "@/registry/default/ui/password-input";
import { Switch } from "@/registry/default/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/default/ui/tabs";
import { Textarea } from "@/registry/default/ui/textarea";

/** Status of a form or of the delete action, exposed as `data-status`. */
type SettingsStatus = "idle" | "pending" | "success" | "error";

/** What the profile form hands to `onSaveProfile`, read from its fields with FormData. */
interface SettingsProfileValues {
  name: string;
  email: string;
  bio: string;
}

/** What the password form hands to `onChangePassword`. */
interface SettingsPasswordValues {
  currentPassword: string;
  newPassword: string;
}

/** The profile the form starts with. */
interface SettingsProfile {
  name?: string;
  email?: string;
  bio?: string;
  /** Image URL for the avatar; initials of `name` show while it loads or when it fails. */
  avatar?: string;
}

/** One switch on the notifications panel. */
interface SettingsNotification {
  /** Key of the switch in the state passed to `onNotificationsChange`. */
  id: string;
  label: ReactNode;
  description?: ReactNode;
  defaultChecked?: boolean;
}

/**
 * A tab. The values `"profile"`, `"account"` and `"notifications"` render
 * the built-in panels; any other value needs `content`, which also replaces
 * a built-in panel.
 */
interface SettingsSection {
  value: string;
  label: ReactNode;
  /** Shown before the label. */
  icon?: ReactNode;
  content?: ReactNode;
}

/** Every string the page shows, including buttons and status messages. */
interface SettingsLabels {
  title: ReactNode;
  description: ReactNode;
  /** Accessible name of the tab list. */
  sections: string;
  profileTab: ReactNode;
  accountTab: ReactNode;
  notificationsTab: ReactNode;

  profileTitle: ReactNode;
  profileDescription: ReactNode;
  name: ReactNode;
  email: ReactNode;
  bio: ReactNode;
  bioHint: ReactNode;
  saveProfile: ReactNode;
  savingProfile: ReactNode;
  profileSuccess: ReactNode;
  profileError: ReactNode;

  passwordTitle: ReactNode;
  passwordDescription: ReactNode;
  currentPassword: ReactNode;
  newPassword: ReactNode;
  passwordHint: ReactNode;
  /** Accessible name of the button that shows a password. */
  showPassword: string;
  changePassword: ReactNode;
  changingPassword: ReactNode;
  passwordSuccess: ReactNode;
  passwordError: ReactNode;

  dangerTitle: ReactNode;
  dangerDescription: ReactNode;
  deleteAccount: ReactNode;
  deleteTitle: ReactNode;
  deleteDescription: ReactNode;
  deleteCancel: ReactNode;
  deleteConfirm: ReactNode;
  deleting: ReactNode;
  deleteSuccess: ReactNode;
  deleteError: ReactNode;

  notificationsTitle: ReactNode;
  notificationsDescription: ReactNode;
}

const defaultLabels: SettingsLabels = {
  title: "Settings",
  description: "Manage your profile, account and notification preferences.",
  sections: "Settings sections",
  profileTab: "Profile",
  accountTab: "Account",
  notificationsTab: "Notifications",

  profileTitle: "Profile",
  profileDescription: "This is how other people see you.",
  name: "Name",
  email: "Email",
  bio: "Bio",
  bioHint: "A few words about yourself.",
  saveProfile: "Save profile",
  savingProfile: "Saving…",
  profileSuccess: "Your profile has been saved.",
  profileError: "Something went wrong. Please try again.",

  passwordTitle: "Password",
  passwordDescription: "Change the password you use to sign in.",
  currentPassword: "Current password",
  newPassword: "New password",
  passwordHint: "At least 8 characters.",
  showPassword: "Show password",
  changePassword: "Update password",
  changingPassword: "Updating…",
  passwordSuccess: "Your password has been updated.",
  passwordError: "Something went wrong. Please try again.",

  dangerTitle: "Danger zone",
  dangerDescription: "Permanently delete your account and everything in it.",
  deleteAccount: "Delete account",
  deleteTitle: "Delete your account?",
  deleteDescription:
    "This permanently deletes your account and all of its data. This cannot be undone.",
  deleteCancel: "Cancel",
  deleteConfirm: "Delete account",
  deleting: "Deleting…",
  deleteSuccess: "Your account has been deleted.",
  deleteError: "Something went wrong. Please try again.",

  notificationsTitle: "Notifications",
  notificationsDescription: "Choose what we email you about.",
};

const defaultProfile: SettingsProfile = {
  name: "Alex Morgan",
  email: "alex@example.com",
  bio: "Product designer at Acme.",
};

const defaultNotifications: SettingsNotification[] = [
  {
    id: "product",
    label: "Product updates",
    description: "News about features and improvements.",
    defaultChecked: true,
  },
  {
    id: "security",
    label: "Security alerts",
    description: "Sign-ins from new devices and password changes.",
    defaultChecked: true,
  },
  {
    id: "comments",
    label: "Comments",
    description: "When someone replies to you or mentions you.",
  },
  {
    id: "marketing",
    label: "Tips and offers",
    description: "Occasional emails about getting more out of Acme.",
  },
];

interface SettingsProps extends Omit<ComponentProps<"section">, "title" | "onSubmit"> {
  /** Overrides for any of the page's strings; the rest keep their English defaults. */
  labels?: Partial<SettingsLabels>;
  /** The tabs, in order. Defaults to Profile, Account and Notifications. */
  sections?: SettingsSection[];
  /** Props for `Tabs`: `defaultValue`, or `value` / `onValueChange` to control the tab. */
  tabsProps?: Omit<ComponentProps<typeof Tabs>, "children" | "orientation">;
  /** The values the profile form starts with. */
  profile?: SettingsProfile;
  /**
   * Called with the profile values instead of a native submit. While it runs
   * the button is disabled; resolving shows `labels.profileSuccess`,
   * throwing shows `labels.profileError`.
   */
  onSaveProfile?: (values: SettingsProfileValues) => void | Promise<void>;
  /** Shortest new password the form accepts. */
  minPasswordLength?: number;
  /**
   * Called with the current and new password. Resolving clears the form and
   * shows `labels.passwordSuccess`; throwing shows `labels.passwordError`.
   */
  onChangePassword?: (values: SettingsPasswordValues) => void | Promise<void>;
  /**
   * Called when the user confirms the delete dialog. The dialog stays open
   * while it runs, closes when it resolves and shows `labels.deleteError`
   * when it throws. Without it, confirming only closes the dialog.
   */
  onDelete?: () => void | Promise<void>;
  /** The switches on the notifications panel. */
  notifications?: SettingsNotification[];
  /** Called with every switch's state, by id, whenever one changes. */
  onNotificationsChange?: (state: Record<string, boolean>) => void;
  /** Props for the profile `<form>`, such as `action` and `method` for a native submit. */
  profileFormProps?: ComponentProps<"form">;
  /** Props for the password `<form>`, such as `action` and `method` for a native submit. */
  passwordFormProps?: ComponentProps<"form">;
}

/** Up to two initials from a name, for the avatar fallback. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

/** Runs an async handler and tracks its status. */
function useStatus() {
  const [status, setStatus] = useState<SettingsStatus>("idle");
  async function run(task: () => void | Promise<void>) {
    setStatus("pending");
    try {
      await task();
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }
  return [status, run] as const;
}

/** The success and error regions under a form: always mounted so screen readers announce them. */
function StatusRegions({
  slot,
  status,
  success,
  error,
}: {
  slot: string;
  status: SettingsStatus;
  success: ReactNode;
  error: ReactNode;
}) {
  return (
    <>
      <p role="status" data-slot={`${slot}-success`} className="text-sm empty:hidden">
        {status === "success" ? success : null}
      </p>
      <p role="alert" data-slot={`${slot}-error`} className="text-destructive text-sm empty:hidden">
        {status === "error" ? error : null}
      </p>
    </>
  );
}

function PanelHeader({ title, description }: { title: ReactNode; description: ReactNode }) {
  return (
    <CardHeader>
      <h2 className="leading-none font-semibold">{title}</h2>
      {description != null ? <CardDescription>{description}</CardDescription> : null}
    </CardHeader>
  );
}

/**
 * An account settings page: a header with an `<h1>` and a description, and
 * tabs for Profile (name, email, bio and avatar), Account (password change
 * and a Danger zone with a confirmation dialog) and Notifications (a list
 * of switches). The tabs stand in a column beside the panels from 768px
 * up and in a row above them on smaller screens. `<Settings />` renders a
 * complete example; every string comes from `labels`.
 *
 * Forms: with `onSaveProfile` / `onChangePassword` the forms do not
 * navigate. Each form gets `data-status="pending"`, then `"success"` or
 * `"error"`, and has its own `role="status"` and `role="alert"` regions,
 * always mounted, so screen readers announce the result. Fields use native
 * validation (`required`, `type="email"`, `minLength`) and `autoComplete`,
 * so password managers fill and save them. Without a handler the form
 * submits natively.
 *
 * Keyboard and screen readers: the tab list is one Tab stop; the arrow keys
 * move between tabs (Up and Down while vertical, Left and Right while
 * horizontal), Home and End jump to the ends. The delete dialog is an alert
 * dialog that traps focus, starts on Cancel and closes with Escape. Each
 * switch is named by its label and described by its description, and
 * applies at once. Only colour transitions and the dialog's fade move;
 * reduced motion turns them off.
 *
 * @example
 * <Settings
 *   profile={{ name: "Sam Lee", email: "sam@example.com" }}
 *   onSaveProfile={async (values) => {
 *     await fetch("/api/profile", { method: "PUT", body: JSON.stringify(values) });
 *   }}
 *   onDelete={() => deleteAccount()}
 *   onNotificationsChange={(state) => savePreferences(state)}
 * />
 */
function Settings({
  labels: labelsProp,
  sections: sectionsProp,
  tabsProps,
  profile = defaultProfile,
  onSaveProfile,
  minPasswordLength = 8,
  onChangePassword,
  onDelete,
  notifications = defaultNotifications,
  onNotificationsChange,
  profileFormProps,
  passwordFormProps,
  className,
  ...props
}: SettingsProps) {
  const id = useId();
  const labels = { ...defaultLabels, ...labelsProp };
  const isDesktop = useMediaQuery("(min-width: 768px)", { defaultValue: true });
  const orientation = isDesktop ? "vertical" : "horizontal";

  const sections = sectionsProp ?? [
    { value: "profile", label: labels.profileTab },
    { value: "account", label: labels.accountTab },
    { value: "notifications", label: labels.notificationsTab },
  ];

  const [profileStatus, runProfile] = useStatus();
  const [passwordStatus, runPassword] = useStatus();
  const [deleteStatus, runDelete] = useStatus();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notificationState, setNotificationState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notifications.map((item) => [item.id, item.defaultChecked ?? false]))
  );

  async function handleProfile(event: SubmitEvent<HTMLFormElement>) {
    profileFormProps?.onSubmit?.(event);
    // No handler, or the consumer cancelled it: leave the native submit alone.
    if (!onSaveProfile || event.defaultPrevented) return;
    event.preventDefault();
    if (profileStatus === "pending") return;
    const data = new FormData(event.currentTarget);
    const values: SettingsProfileValues = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      bio: String(data.get("bio") ?? ""),
    };
    await runProfile(() => onSaveProfile(values));
  }

  async function handlePassword(event: SubmitEvent<HTMLFormElement>) {
    passwordFormProps?.onSubmit?.(event);
    if (!onChangePassword || event.defaultPrevented) return;
    event.preventDefault();
    if (passwordStatus === "pending") return;
    // React clears currentTarget once the event is handled, so keep the form.
    const form = event.currentTarget;
    const data = new FormData(form);
    const values: SettingsPasswordValues = {
      currentPassword: String(data.get("current-password") ?? ""),
      newPassword: String(data.get("new-password") ?? ""),
    };
    if (await runPassword(() => onChangePassword(values))) form.reset();
  }

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open until the handler settles.
    event.preventDefault();
    if (deleteStatus === "pending") return;
    if (!onDelete) {
      setDeleteOpen(false);
      return;
    }
    if (await runDelete(onDelete)) setDeleteOpen(false);
  }

  function toggleNotification(key: string, checked: boolean) {
    const next = { ...notificationState, [key]: checked };
    setNotificationState(next);
    onNotificationsChange?.(next);
  }

  const profilePending = profileStatus === "pending";
  const passwordPending = passwordStatus === "pending";
  const deletePending = deleteStatus === "pending";

  const profilePanel = (
    <Card data-slot="settings-profile">
      <PanelHeader title={labels.profileTitle} description={labels.profileDescription} />
      <form
        data-slot="settings-profile-form"
        data-status={profileStatus}
        {...profileFormProps}
        className={cn("flex flex-col gap-6", profileFormProps?.className)}
        onSubmit={handleProfile}
      >
        <CardContent>
          <FieldGroup>
            <div data-slot="settings-avatar" className="flex items-center gap-4">
              <Avatar size="lg" aria-hidden="true">
                {profile.avatar ? <AvatarImage src={profile.avatar} alt="" /> : null}
                <AvatarFallback>{initials(profile.name ?? "")}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 text-sm">
                <span className="truncate font-medium">{profile.name}</span>
                <span className="text-muted-foreground truncate">{profile.email}</span>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${id}-name`}>{labels.name}</FieldLabel>
                <Input
                  id={`${id}-name`}
                  name="name"
                  autoComplete="name"
                  defaultValue={profile.name}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-email`}>{labels.email}</FieldLabel>
                <Input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={profile.email}
                  required
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-bio`}>{labels.bio}</FieldLabel>
              <Textarea
                id={`${id}-bio`}
                name="bio"
                rows={4}
                defaultValue={profile.bio}
                aria-describedby={`${id}-bio-hint`}
              />
              <FieldDescription id={`${id}-bio-hint`}>{labels.bioHint}</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <Button type="submit" data-slot="settings-profile-submit" loading={profilePending}>
            {profilePending ? labels.savingProfile : labels.saveProfile}
          </Button>
          <StatusRegions
            slot="settings-profile"
            status={profileStatus}
            success={labels.profileSuccess}
            error={labels.profileError}
          />
        </CardFooter>
      </form>
    </Card>
  );

  const accountPanel = (
    <div className="flex flex-col gap-6">
      <Card data-slot="settings-password">
        <PanelHeader title={labels.passwordTitle} description={labels.passwordDescription} />
        <form
          data-slot="settings-password-form"
          data-status={passwordStatus}
          {...passwordFormProps}
          className={cn("flex flex-col gap-6", passwordFormProps?.className)}
          onSubmit={handlePassword}
        >
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-current-password`}>{labels.currentPassword}</FieldLabel>
                <PasswordInput
                  id={`${id}-current-password`}
                  name="current-password"
                  autoComplete="current-password"
                  toggleLabel={labels.showPassword}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-new-password`}>{labels.newPassword}</FieldLabel>
                <PasswordInput
                  id={`${id}-new-password`}
                  name="new-password"
                  autoComplete="new-password"
                  minLength={minPasswordLength}
                  aria-describedby={`${id}-new-password-hint`}
                  toggleLabel={labels.showPassword}
                  required
                />
                <FieldDescription id={`${id}-new-password-hint`}>
                  {labels.passwordHint}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <Button type="submit" data-slot="settings-password-submit" loading={passwordPending}>
              {passwordPending ? labels.changingPassword : labels.changePassword}
            </Button>
            <StatusRegions
              slot="settings-password"
              status={passwordStatus}
              success={labels.passwordSuccess}
              error={labels.passwordError}
            />
          </CardFooter>
        </form>
      </Card>
      <Card
        data-slot="settings-danger"
        data-status={deleteStatus}
        className="border-destructive/50"
      >
        <PanelHeader title={labels.dangerTitle} description={labels.dangerDescription} />
        <CardFooter className="flex-col items-start gap-4">
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-slot="settings-delete">
                {labels.deleteAccount}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{labels.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>{labels.deleteDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              {/* The page behind a modal is hidden from screen readers: report errors in here too. */}
              <p
                role="alert"
                data-slot="settings-delete-dialog-error"
                className="text-destructive text-sm empty:hidden"
              >
                {deleteStatus === "error" ? labels.deleteError : null}
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel>{labels.deleteCancel}</AlertDialogCancel>
                <AlertDialogAction
                  data-slot="settings-delete-confirm"
                  className={buttonVariants({ variant: "destructive" })}
                  disabled={deletePending}
                  onClick={handleDelete}
                >
                  {deletePending ? labels.deleting : labels.deleteConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <StatusRegions
            slot="settings-delete"
            status={deleteStatus}
            success={labels.deleteSuccess}
            error={labels.deleteError}
          />
        </CardFooter>
      </Card>
    </div>
  );

  const notificationsPanel = (
    <Card data-slot="settings-notifications">
      <PanelHeader
        title={labels.notificationsTitle}
        description={labels.notificationsDescription}
      />
      <CardContent>
        <ul data-slot="settings-notification-list" className="flex flex-col divide-y">
          {notifications.map((item) => {
            const switchId = `${id}-notification-${item.id}`;
            return (
              <li
                key={item.id}
                data-slot="settings-notification"
                className="py-4 first:pt-0 last:pb-0"
              >
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={switchId}>{item.label}</FieldLabel>
                    {item.description != null ? (
                      <FieldDescription id={`${switchId}-description`}>
                        {item.description}
                      </FieldDescription>
                    ) : null}
                  </FieldContent>
                  <Switch
                    id={switchId}
                    name={item.id}
                    checked={notificationState[item.id] ?? false}
                    onCheckedChange={(checked) => toggleNotification(item.id, checked)}
                    aria-describedby={
                      item.description != null ? `${switchId}-description` : undefined
                    }
                  />
                </Field>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );

  const builtIn: Record<string, ReactNode> = {
    profile: profilePanel,
    account: accountPanel,
    notifications: notificationsPanel,
  };

  return (
    <section data-slot="settings" className={cn("py-10 sm:py-16", className)} {...props}>
      <div data-slot="settings-container" className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div data-slot="settings-header" className="max-w-2xl">
          <h1
            data-slot="settings-title"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {labels.title}
          </h1>
          {labels.description != null ? (
            <p data-slot="settings-description" className="text-muted-foreground mt-2">
              {labels.description}
            </p>
          ) : null}
        </div>
        <Tabs
          defaultValue={sections[0]?.value}
          {...tabsProps}
          orientation={orientation}
          className={cn("mt-8 gap-6 md:gap-10", tabsProps?.className)}
        >
          <TabsList
            variant="line"
            aria-label={labels.sections}
            className="w-full shrink-0 justify-start overflow-x-auto md:w-48"
          >
            {sections.map((section) => (
              <TabsTrigger key={section.value} value={section.value}>
                {section.icon}
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {sections.map((section) => (
            <TabsContent key={section.value} value={section.value} className="min-w-0">
              {section.content ?? builtIn[section.value]}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

export {
  Settings,
  type SettingsLabels,
  type SettingsNotification,
  type SettingsPasswordValues,
  type SettingsProfile,
  type SettingsProfileValues,
  type SettingsProps,
  type SettingsSection,
  type SettingsStatus,
};
