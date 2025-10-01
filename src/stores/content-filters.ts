import { create } from "zustand";
import { isTest } from "../lib/device";
import { FilterFile, FieldEnum } from "../lib/filters/schema";
import { filterPolitics } from "../lib/filters/politics";
import { applyFilters, optimizeFilterFile } from "../lib/filters/filter";
import { useMemo } from "react";

type Filter = {
  source: string;
  file: FilterFile;
};

type ContentFiltersStore = {
  filters: Filter[];
};

const INIT_STATE = {
  filters: [
    {
      source: "",
      file: optimizeFilterFile(filterPolitics),
    },
  ],
} satisfies ContentFiltersStore;

export const useContentFiltersStore = create<ContentFiltersStore>()((set) => ({
  ...INIT_STATE,
  reset: () => {
    if (isTest()) {
      set(INIT_STATE);
    }
  },
}));

export function useIsCommunityBlockedByContentFilters(communityName?: string) {
  const filters = useContentFiltersStore((s) => s.filters);

  return useMemo(() => {
    if (!communityName) {
      return false;
    }

    for (const { file } of filters) {
      const rule = applyFilters(
        {
          [FieldEnum.community_name]: communityName,
        },
        file,
      );
      if (rule) {
        return rule;
      }
    }

    return false;
  }, [filters, communityName]);
}
