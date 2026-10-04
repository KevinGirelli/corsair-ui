import hooks from "../hooks/registry.json";
import lib from "../lib/registry.json";
import ui from "../ui/registry.json";

interface GalleryItem {
  name: string;
  title: string;
  description: string;
  type: string;
}

interface RegistryEntry {
  name: string;
  type: string;
  title?: string;
  description?: string;
}

const entries = (registry: { items: unknown[] }) => registry.items as RegistryEntry[];

/** The theme first, then the components, then the hooks and utilities. */
const rank = (item: GalleryItem) =>
  item.name === "theme" ? 0 : item.type === "registry:ui" ? 1 : 2;

/** Every item of the React Native registry, read from its registry files. */
const ITEMS: GalleryItem[] = [...entries(lib), ...entries(hooks), ...entries(ui)]
  .map((entry) => ({
    name: entry.name,
    type: entry.type,
    title: entry.title ?? entry.name,
    description: entry.description ?? "",
  }))
  .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));

export { ITEMS, type GalleryItem };
