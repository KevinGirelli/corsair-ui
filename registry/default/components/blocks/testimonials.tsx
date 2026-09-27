import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/default/ui/avatar";
import { Card } from "@/registry/default/ui/card";

interface Testimonial {
  /** Used as the React key; falls back to the index. */
  id?: string;
  quote: ReactNode;
  name: string;
  role?: ReactNode;
  /** Image URL. Without one, the initials of `name` are shown. */
  avatar?: string;
}

interface TestimonialsProps extends Omit<ComponentProps<"section">, "title"> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  testimonials?: Testimonial[];
  /** "masonry" flows cards of different heights into columns; "grid" aligns them in rows. */
  variant?: "grid" | "masonry";
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    quote:
      "We moved our whole team over in an afternoon. Planning meetings are shorter because everyone already knows where things stand.",
    name: "Nadia Brooks",
    role: "Engineering manager",
  },
  {
    id: "2",
    quote: "The setup took five minutes and it just works.",
    name: "Tomás Rivera",
    role: "Founder",
  },
  {
    id: "3",
    quote:
      "I used to keep three spreadsheets to track releases. Now it is one shared view that updates itself, and I finally trust the numbers.",
    name: "Hannah Lindqvist",
    role: "Product lead",
  },
  {
    id: "4",
    quote: "Support answered within the hour, every time we asked.",
    name: "Kofi Mensah",
    role: "Head of operations",
  },
  {
    id: "5",
    quote:
      "Clear pricing, a clean interface and no surprises. It is the rare tool the whole company actually likes using.",
    name: "Mei Tanaka",
    role: "Product designer",
  },
  {
    id: "6",
    quote: "Our onboarding checklist went from a document nobody read to something people finish.",
    name: "Ravi Iyer",
    role: "Customer success lead",
  },
];

/** First letter of the first and last word, uppercased: "Ada Lovelace" → "AL". */
function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (first === undefined) return "";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const letter = (word: string | undefined) => (word ? (Array.from(word)[0] ?? "") : "");
  return (letter(first) + letter(last)).toUpperCase();
}

// Full class names so Tailwind picks them up.
const LIST_VARIANTS = {
  masonry: "columns-1 gap-6 sm:columns-2 lg:columns-3",
  grid: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
} as const;

/**
 * A wall of customer quotes under a centred header. Each quote is a
 * `<figure>` with a `<blockquote>` and a `<figcaption>` holding an avatar,
 * the person's name and an optional role. Without an `avatar` image the
 * avatar shows the initials of `name`. The default "masonry" variant flows
 * quotes of different lengths into columns; "grid" lines them up in rows.
 *
 * Accessibility: the title is an `<h2>` and the quotes are a list. The
 * avatar is hidden from screen readers because the name is right next to
 * it.
 *
 * @example
 * <Testimonials
 *   title="What people say"
 *   variant="grid"
 *   testimonials={[{ quote: "It saves us hours.", name: "Sam Carter", role: "Team lead" }]}
 * />
 */
function Testimonials({
  className,
  eyebrow = "Testimonials",
  title = "Loved by teams who ship",
  description = "Here is what people say after switching their work over.",
  testimonials = DEFAULT_TESTIMONIALS,
  variant = "masonry",
  ...props
}: TestimonialsProps) {
  const hasHeader = eyebrow != null || title != null || description != null;

  return (
    <section
      data-slot="testimonials"
      data-variant={variant}
      className={cn("py-16 sm:py-24", className)}
      {...props}
    >
      <div data-slot="testimonials-container" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {hasHeader ? (
          <div data-slot="testimonials-header" className="mx-auto max-w-2xl text-center">
            {eyebrow != null ? (
              <p
                data-slot="testimonials-eyebrow"
                className="text-muted-foreground text-sm font-medium"
              >
                {eyebrow}
              </p>
            ) : null}
            {title != null ? (
              <h2
                data-slot="testimonials-title"
                className={cn(
                  "text-3xl font-semibold tracking-tight text-balance sm:text-4xl",
                  eyebrow != null && "mt-2"
                )}
              >
                {title}
              </h2>
            ) : null}
            {description != null ? (
              <p
                data-slot="testimonials-description"
                className="text-muted-foreground mt-4 text-lg text-pretty"
              >
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        <ul
          data-slot="testimonials-list"
          className={cn(LIST_VARIANTS[variant], hasHeader && "mt-12")}
        >
          {testimonials.map((testimonial, index) => (
            <li
              key={testimonial.id ?? index}
              data-slot="testimonials-item"
              className={cn(variant === "masonry" ? "mb-6 break-inside-avoid" : "flex")}
            >
              <Card data-slot="testimonial-card" className="w-full px-6">
                <figure data-slot="testimonial" className="flex h-full flex-col gap-6">
                  <blockquote data-slot="testimonial-quote" className="flex-1 text-pretty">
                    {testimonial.quote}
                  </blockquote>
                  <figcaption data-slot="testimonial-author" className="flex items-center gap-3">
                    <Avatar aria-hidden="true" size="lg" data-slot="testimonial-avatar">
                      {testimonial.avatar ? <AvatarImage src={testimonial.avatar} alt="" /> : null}
                      <AvatarFallback>{getInitials(testimonial.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col text-sm">
                      <span data-slot="testimonial-name" className="font-medium">
                        {testimonial.name}
                      </span>
                      {testimonial.role != null ? (
                        <span data-slot="testimonial-role" className="text-muted-foreground">
                          {testimonial.role}
                        </span>
                      ) : null}
                    </div>
                  </figcaption>
                </figure>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { Testimonials, type Testimonial, type TestimonialsProps };
