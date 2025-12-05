import { Sidebar, SidebarContent } from "@/src/components/sidebar";
import { Button } from "@/src/components/ui/button";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { useSearchStore } from "@/src/stores/search";
import { useSidebarStore } from "@/src/stores/sidebars";
import { Collapsible } from "@radix-ui/react-collapsible";
import { ChevronsUpDown } from "lucide-react";
import { X } from "@/src/components/icons";

export function RecentSearchesSidebar({
  onSelect,
}: {
  onSelect: (val: string) => void;
}) {
  const modsOpen = useSidebarStore((s) => s.recentSearchesExpanded);
  const setModsOpen = useSidebarStore((s) => s.setRecentSearchesExpanded);

  const searchHistory = useSearchStore((s) => s.searchHistory);
  const removeSearch = useSearchStore((s) => s.removeSearch);

  return (
    <Sidebar>
      <SidebarContent>
        <Collapsible className="p-4" open={modsOpen} onOpenChange={setModsOpen}>
          <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
            <span>RECENT SEARCHES</span>
            <ChevronsUpDown className="h-4 w-4" />
          </CollapsibleTrigger>

          <CollapsibleContent className="flex flex-col gap-1 pt-3">
            {searchHistory.map((item) => (
              <div className="flex flex-row items-center" key={item}>
                <button
                  className="text-start flex-1 overflow-hidden text-ellipsis text-nowrap"
                  onClick={() => onSelect(item)}
                >
                  {item}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="remove from search"
                  className="-mr-2"
                  onClick={() => removeSearch(item)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}
