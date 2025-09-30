import { FieldEnum, LemmyFilters } from "./schema";

export const filterPolitics: LemmyFilters = {
  spec_version: "lemmy-filters/1.0",
  options: {
    normalize: "nfkc_casefold",
    strip_diacritics: true,
    max_body_chars: 50000,
  },
  rules: [
    {
      name: "Hide political communitites",
      any: [
        {
          field: FieldEnum.community_name,
          op: "substring",
          pattern: "political",
        },
        {
          field: FieldEnum.community_name,
          op: "substring",
          pattern: "politics",
        },
        {
          field: FieldEnum.community_name,
          op: "substring",
          pattern: "trump",
        },
      ],
      action: "hide",
    },
    {
      name: "Hide political posts",
      any: [
        { field: FieldEnum.title, op: "substring", pattern: "epstein files" },
        { field: FieldEnum.title, op: "substring", pattern: "charlie kirk" },
        { field: FieldEnum.title, op: "substring", pattern: "pete hegseth" },
        { field: FieldEnum.title, op: "word", pattern: "trump" },
        { field: FieldEnum.title, op: "word", pattern: "vance" },
        { field: FieldEnum.title, op: "word", pattern: "democrat" },
      ],
      action: "hide",
    },
    {
      name: "ICE",
      all: [
        { field: FieldEnum.title, op: "substring", pattern: "ice" },
        {
          any: [
            { field: FieldEnum.title, op: "word", pattern: "detention" },
            { field: FieldEnum.title, op: "substring", pattern: "deport" },
          ],
        },
      ],
      action: "hide",
    },
    {
      name: "Shooting",
      all: [
        {
          any: [
            { field: FieldEnum.title, op: "word", pattern: "alabama" },
            { field: FieldEnum.title, op: "word", pattern: "alaska" },
            { field: FieldEnum.title, op: "word", pattern: "arizona" },
            { field: FieldEnum.title, op: "word", pattern: "arkansas" },
            { field: FieldEnum.title, op: "word", pattern: "california" },
            { field: FieldEnum.title, op: "word", pattern: "colorado" },
            { field: FieldEnum.title, op: "word", pattern: "connecticut" },
            { field: FieldEnum.title, op: "word", pattern: "delaware" },
            { field: FieldEnum.title, op: "word", pattern: "florida" },
            { field: FieldEnum.title, op: "word", pattern: "georgia" },
            { field: FieldEnum.title, op: "word", pattern: "hawaii" },
            { field: FieldEnum.title, op: "word", pattern: "idaho" },
            { field: FieldEnum.title, op: "word", pattern: "illinois" },
            { field: FieldEnum.title, op: "word", pattern: "indiana" },
            { field: FieldEnum.title, op: "word", pattern: "iowa" },
            { field: FieldEnum.title, op: "word", pattern: "kansas" },
            { field: FieldEnum.title, op: "word", pattern: "kentucky" },
            { field: FieldEnum.title, op: "word", pattern: "louisiana" },
            { field: FieldEnum.title, op: "word", pattern: "maine" },
            { field: FieldEnum.title, op: "word", pattern: "maryland" },
            { field: FieldEnum.title, op: "word", pattern: "massachusetts" },
            { field: FieldEnum.title, op: "word", pattern: "michigan" },
            { field: FieldEnum.title, op: "word", pattern: "minnesota" },
            { field: FieldEnum.title, op: "word", pattern: "mississippi" },
            { field: FieldEnum.title, op: "word", pattern: "missouri" },
            { field: FieldEnum.title, op: "word", pattern: "montana" },
            { field: FieldEnum.title, op: "word", pattern: "nebraska" },
            { field: FieldEnum.title, op: "word", pattern: "nevada" },
            {
              field: FieldEnum.title,
              op: "substring",
              pattern: "new hampshire",
            },
            { field: FieldEnum.title, op: "substring", pattern: "new jersey" },
            { field: FieldEnum.title, op: "substring", pattern: "new mexico" },
            { field: FieldEnum.title, op: "substring", pattern: "new york" },
            {
              field: FieldEnum.title,
              op: "substring",
              pattern: "north carolina",
            },
            {
              field: FieldEnum.title,
              op: "substring",
              pattern: "north dakota",
            },
            { field: FieldEnum.title, op: "word", pattern: "ohio" },
            { field: FieldEnum.title, op: "word", pattern: "oklahoma" },
            { field: FieldEnum.title, op: "word", pattern: "oregon" },
            { field: FieldEnum.title, op: "word", pattern: "pennsylvania" },
            {
              field: FieldEnum.title,
              op: "substring",
              pattern: "rhode island",
            },
            {
              field: FieldEnum.title,
              op: "substring",
              pattern: "south carolina",
            },
            {
              field: FieldEnum.title,
              op: "substring",
              pattern: "south dakota",
            },
            { field: FieldEnum.title, op: "word", pattern: "tennessee" },
            { field: FieldEnum.title, op: "word", pattern: "texas" },
            { field: FieldEnum.title, op: "word", pattern: "utah" },
            { field: FieldEnum.title, op: "word", pattern: "vermont" },
            { field: FieldEnum.title, op: "word", pattern: "virginia" },
            { field: FieldEnum.title, op: "word", pattern: "washington" },
            {
              field: FieldEnum.title,
              op: "substring",
              pattern: "west virginia",
            },
            { field: FieldEnum.title, op: "word", pattern: "wisconsin" },
            { field: FieldEnum.title, op: "word", pattern: "wyoming" },
          ],
        },
        {
          any: [
            { field: FieldEnum.title, op: "substring", pattern: "shoot up" },
            { field: FieldEnum.title, op: "word", pattern: "shooting" },
          ],
        },
      ],
      action: "hide",
    },
  ],
};
