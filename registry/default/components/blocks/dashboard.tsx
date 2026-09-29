"use client";

import {
  ChartColumnIcon,
  CommandIcon,
  FolderIcon,
  HouseIcon,
  InboxIcon,
  LifeBuoyIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/default/ui/avatar";
import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/registry/default/ui/card";
import {
  DataTable,
  type DataTableColumnDef,
  type DataTableProps,
} from "@/registry/default/ui/data-table";
import { LineChart, type LineChartProps } from "@/registry/default/ui/line-chart";
import { Separator } from "@/registry/default/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  type SidebarProps,
  type SidebarProviderProps,
} from "@/registry/default/ui/sidebar";
import {
  Stat,
  StatCaption,
  StatGroup,
  StatLabel,
  StatValue,
  type StatTrend,
} from "@/registry/default/ui/stat";

/** One link in the sidebar. */
interface DashboardNavItem {
  /** Stable React key. Falls back to `href`. */
  id?: string;
  /** Visible text; also the tooltip while the sidebar is collapsed to icons. */
  label: string;
  href: string;
  /** Shown before the label and kept when the sidebar collapses to icons. */
  icon?: ReactNode;
  /** A count or status beside the link ("12", "New"). */
  badge?: ReactNode;
  /** Marks the current page: highlighted and announced as `aria-current="page"`. */
  active?: boolean;
}

/** A labelled group of sidebar links. */
interface DashboardNavGroup {
  /** Stable React key. Falls back to the index. */
  id?: string;
  label: ReactNode;
  items: DashboardNavItem[];
}

/** The account shown at the bottom of the sidebar. */
interface DashboardUser {
  name: string;
  email?: string;
  /** Image URL for the avatar; initials of `name` show while it loads or when it fails. */
  avatar?: string;
}

/** One figure in the row of stat cards. */
interface DashboardStat {
  /** Stable React key. Falls back to the index. */
  id?: string;
  label: ReactNode;
  /** Rendered as is: format numbers before passing them. */
  value: ReactNode;
  /** A note under the value: a comparison, a period. */
  caption?: ReactNode;
  /** Adds an arrow for the direction of change next to the caption. */
  trend?: StatTrend;
}

/** The chart card: a title and any `LineChart` props (`data`, `labels`, `numberFormat`…). */
interface DashboardChart extends Omit<LineChartProps, "title"> {
  title: ReactNode;
  description?: ReactNode;
  labels: string[];
}

/** The table card: a title and any `DataTable` props (`columns`, `data`, `pageSize`…). */
interface DashboardTable<TData extends object> extends Omit<DataTableProps<TData>, "title"> {
  title: ReactNode;
  description?: ReactNode;
}

/** A row of the default recent-activity table. */
interface DashboardActivity {
  id: string;
  customer: string;
  email: string;
  status: "Paid" | "Pending" | "Failed";
  amount: string;
  date: string;
}

interface DashboardProps<TData extends object = DashboardActivity> extends Omit<
  ComponentProps<"div">,
  "title"
> {
  /** Shown at the top of the sidebar: a logo and a name. */
  brand?: ReactNode;
  /** Groups of links in the sidebar. */
  nav?: DashboardNavGroup[];
  /** The signed-in account at the bottom of the sidebar. Pass `null` to hide it. */
  user?: DashboardUser | null;
  /** Page title, rendered as the `<h1>` in the header. */
  title?: ReactNode;
  /** Buttons at the end of the header. Pass `null` to hide them. */
  actions?: ReactNode;
  /** The row of stat cards. Pass an empty array to hide it. */
  stats?: DashboardStat[];
  /** Read to screen readers before a caption with a trend, since the arrow is only a picture. */
  trendLabels?: Partial<Record<StatTrend, string>>;
  /** The line chart card. Pass `null` to hide it. */
  chart?: DashboardChart | null;
  /** The recent-activity table card. Pass `null` to hide it. */
  table?: DashboardTable<TData> | null;
  /** Extra content under the cards. */
  children?: ReactNode;
  /** Props for `SidebarProvider`: `defaultOpen`, `open`, `onOpenChange`, `shortcut`, `width`. */
  providerProps?: Omit<SidebarProviderProps, "children">;
  /** Props for `Sidebar`: `collapsible`, `side`, `aria-label`, `className`. */
  sidebarProps?: Omit<SidebarProps, "children">;
  /** Props for the `<main>` next to the sidebar. */
  insetProps?: Omit<ComponentProps<"main">, "children">;
}

const defaultTrendLabels: Record<StatTrend, string> = {
  up: "Increase",
  down: "Decrease",
  flat: "No change",
};

const defaultBrand = (
  <div data-slot="dashboard-brand" className="flex items-center gap-2 overflow-hidden">
    <span
      aria-hidden="true"
      className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
    >
      <CommandIcon className="size-4" />
    </span>
    <span className="truncate text-sm font-semibold group-data-[state=collapsed]/sidebar:sr-only">
      Acme Inc
    </span>
  </div>
);

const defaultNav: DashboardNavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "#overview",
        icon: <HouseIcon aria-hidden="true" />,
        active: true,
      },
      { label: "Inbox", href: "#inbox", icon: <InboxIcon aria-hidden="true" />, badge: "4" },
      { label: "Projects", href: "#projects", icon: <FolderIcon aria-hidden="true" /> },
      { label: "Reports", href: "#reports", icon: <ChartColumnIcon aria-hidden="true" /> },
      { label: "Customers", href: "#customers", icon: <UsersIcon aria-hidden="true" /> },
    ],
  },
  {
    id: "general",
    label: "General",
    items: [
      { label: "Settings", href: "#settings", icon: <SettingsIcon aria-hidden="true" /> },
      { label: "Support", href: "#support", icon: <LifeBuoyIcon aria-hidden="true" /> },
    ],
  },
];

const defaultUser: DashboardUser = { name: "Alex Morgan", email: "alex@example.com" };

const defaultActions = (
  <Button size="sm">
    <PlusIcon aria-hidden="true" />
    New report
  </Button>
);

const defaultStats: DashboardStat[] = [
  {
    id: "revenue",
    label: "Revenue",
    value: "$48,200",
    caption: "12% since last month",
    trend: "up",
  },
  {
    id: "customers",
    label: "Customers",
    value: "1,240",
    caption: "86 new this month",
    trend: "up",
  },
  { id: "orders", label: "Orders", value: "3,512", caption: "4% since last month", trend: "down" },
  { id: "uptime", label: "Uptime", value: "99.9%", caption: "Same as last month", trend: "flat" },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const defaultChart: DashboardChart = {
  title: "Revenue",
  description: "Monthly revenue over the last twelve months.",
  name: "Revenue",
  data: [18, 22, 21, 26, 30, 28, 34, 37, 35, 41, 44, 48],
  labels: months,
  formatValue: (value) => `$${value}k`,
  formatValueText: (value, index) => `${months[index]}: $${value}k`,
};

const statusVariants = {
  Paid: "success",
  Pending: "warning",
  Failed: "destructive",
} as const;

const defaultColumns: DataTableColumnDef<DashboardActivity>[] = [
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.customer}</span>
        <span className="text-muted-foreground text-xs">{row.original.email}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusVariants[row.original.status]}>{row.original.status}</Badge>
    ),
  },
  { accessorKey: "date", header: "Date" },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span className="tabular-nums">{row.original.amount}</span>,
  },
];

const defaultRows: DashboardActivity[] = [
  {
    id: "inv-1024",
    customer: "Jordan Lee",
    email: "jordan@example.com",
    status: "Paid",
    amount: "$250.00",
    date: "Dec 12",
  },
  {
    id: "inv-1023",
    customer: "Sam Rivera",
    email: "sam@example.com",
    status: "Pending",
    amount: "$120.00",
    date: "Dec 11",
  },
  {
    id: "inv-1022",
    customer: "Taylor Kim",
    email: "taylor@example.com",
    status: "Paid",
    amount: "$980.00",
    date: "Dec 10",
  },
  {
    id: "inv-1021",
    customer: "Casey Brooks",
    email: "casey@example.com",
    status: "Failed",
    amount: "$64.00",
    date: "Dec 9",
  },
  {
    id: "inv-1020",
    customer: "Morgan Diaz",
    email: "morgan@example.com",
    status: "Paid",
    amount: "$410.00",
    date: "Dec 8",
  },
];

const defaultTable: DashboardTable<DashboardActivity> = {
  title: "Recent activity",
  description: "The latest payments from your customers.",
  columns: defaultColumns,
  data: defaultRows,
  getRowId: (row) => row.id,
  filterLabel: "Filter activity",
  pageSize: null,
};

/** Up to two initials from a name, for the avatar fallback. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

/** The sidebar links; closes the mobile sheet after a link is followed. */
function DashboardNav({ nav }: { nav: DashboardNavGroup[] }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return nav.map((group, groupIndex) => (
    <SidebarGroup key={group.id ?? groupIndex} data-slot="dashboard-nav-group">
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => (
          <SidebarMenuItem key={item.id ?? item.href}>
            <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
              <a
                href={item.href}
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            </SidebarMenuButton>
            {item.badge != null ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  ));
}

/**
 * An application page: a collapsible sidebar with a brand, groups of links
 * and the signed-in account, next to a `<main>` with a header (sidebar
 * trigger, `<h1>` title, actions), a row of stat cards, a line chart card
 * and a recent-activity table. `<Dashboard />` renders a complete example
 * for a fictional "Acme"; every piece is a prop, and `null` hides it.
 *
 * Layout: the root is the `SidebarProvider` wrapper, a flex row that fills
 * the viewport (`min-h-svh`) with a sticky, full-height sidebar. To contain
 * it in a box (a preview, a docs page), give the root a height and clip it,
 * make the sidebar fill that height and let the main area scroll:
 * `className="h-[640px] min-h-0 overflow-hidden"`,
 * `sidebarProps={{ className: "h-full" }}` and
 * `insetProps={{ className: "overflow-auto" }}`. Below 768px the sidebar
 * opens as a sheet over the viewport.
 *
 * Keyboard and screen readers: the sidebar is a named complementary
 * landmark and the page a `<main>`; ⌘B / Ctrl+B or the trigger toggles the
 * sidebar (set `providerProps.shortcut` to change or disable it). The
 * active link is announced as the current page, and collapsed to icons each
 * link keeps its name and shows a tooltip. Stats are a description list
 * with trend arrows replaced by `trendLabels`; the chart is a slider that
 * the arrow keys move between points; the table has sortable headers and a
 * filter. Motion (sidebar width, chart cursor) stops with
 * `prefers-reduced-motion`.
 *
 * @example
 * <Dashboard
 *   title="Overview"
 *   user={{ name: "Sam Lee", email: "sam@example.com" }}
 *   providerProps={{ defaultOpen: false }}
 *   stats={[{ label: "Revenue", value: "$12,400", caption: "8% up", trend: "up" }]}
 *   chart={{ title: "Visitors", data: [4, 6, 5, 9], labels: ["Q1", "Q2", "Q3", "Q4"] }}
 *   table={null}
 * />
 */
function Dashboard<TData extends object = DashboardActivity>({
  brand = defaultBrand,
  nav = defaultNav,
  user = defaultUser,
  title = "Dashboard",
  actions = defaultActions,
  stats = defaultStats,
  trendLabels,
  chart = defaultChart,
  table = defaultTable as unknown as DashboardTable<TData>,
  children,
  providerProps,
  sidebarProps,
  insetProps,
  className,
  ...props
}: DashboardProps<TData>) {
  const labels = { ...defaultTrendLabels, ...trendLabels };

  return (
    <SidebarProvider
      data-slot="dashboard"
      {...providerProps}
      {...props}
      className={cn(providerProps?.className, className)}
    >
      <Sidebar {...sidebarProps}>
        {brand != null ? <SidebarHeader>{brand}</SidebarHeader> : null}
        <SidebarContent>
          <DashboardNav nav={nav} />
        </SidebarContent>
        {user ? (
          <SidebarFooter>
            <div data-slot="dashboard-user" className="flex items-center gap-2 overflow-hidden">
              <Avatar aria-hidden="true">
                {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-sm leading-tight group-data-[state=collapsed]/sidebar:sr-only">
                <span data-slot="dashboard-user-name" className="truncate font-medium">
                  {user.name}
                </span>
                {user.email ? (
                  <span
                    data-slot="dashboard-user-email"
                    className="text-muted-foreground truncate text-xs"
                  >
                    {user.email}
                  </span>
                ) : null}
              </div>
            </div>
          </SidebarFooter>
        ) : null}
      </Sidebar>
      <SidebarInset {...insetProps}>
        <header
          data-slot="dashboard-header"
          className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6"
        >
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1
            data-slot="dashboard-title"
            className="min-w-0 flex-1 truncate text-base font-semibold"
          >
            {title}
          </h1>
          {actions != null ? (
            <div data-slot="dashboard-actions" className="flex items-center gap-2">
              {actions}
            </div>
          ) : null}
        </header>
        <div data-slot="dashboard-content" className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          {stats.length > 0 ? (
            <StatGroup data-slot="dashboard-stats" className="gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <Stat
                  key={stat.id ?? index}
                  className="bg-card min-w-0 gap-2 rounded-xl border p-6"
                >
                  <StatLabel>{stat.label}</StatLabel>
                  <StatValue className="break-words">{stat.value}</StatValue>
                  {stat.caption != null || stat.trend ? (
                    <StatCaption
                      trend={stat.trend}
                      trendLabel={stat.trend ? labels[stat.trend] : undefined}
                    >
                      {stat.caption}
                    </StatCaption>
                  ) : null}
                </Stat>
              ))}
            </StatGroup>
          ) : null}
          {chart ? <DashboardChartCard {...chart} /> : null}
          {table ? <DashboardTableCard {...table} /> : null}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardChartCard({ title, description, name, ...chart }: DashboardChart) {
  return (
    <Card data-slot="dashboard-chart" className="min-w-0">
      <CardHeader>
        <h2 data-slot="dashboard-chart-title" className="leading-none font-semibold">
          {title}
        </h2>
        {description != null ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <LineChart name={name ?? (typeof title === "string" ? title : undefined)} {...chart} />
      </CardContent>
    </Card>
  );
}

function DashboardTableCard<TData extends object>({
  title,
  description,
  caption,
  ...table
}: DashboardTable<TData>) {
  return (
    <Card data-slot="dashboard-table" className="min-w-0">
      <CardHeader>
        <h2 data-slot="dashboard-table-title" className="leading-none font-semibold">
          {title}
        </h2>
        {description != null ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <DataTable
          caption={caption ?? (typeof title === "string" ? title : undefined)}
          {...table}
        />
      </CardContent>
    </Card>
  );
}

export {
  Dashboard,
  type DashboardActivity,
  type DashboardChart,
  type DashboardNavGroup,
  type DashboardNavItem,
  type DashboardProps,
  type DashboardStat,
  type DashboardTable,
  type DashboardUser,
};
