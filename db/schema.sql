create extension if not exists vector;

create table if not exists ads (
  id                 text primary key,
  brand              text not null,
  category           text not null,
  image_path         text not null,
  ad_library_url     text,
  started_on         date,
  ended_on           date,         -- null while the ad is still running
  primary_text       text,
  hook_type          text,
  format             text,
  offer              text,
  product_visibility text,
  text_density       text,
  has_person         boolean,
  language           text,
  headline_text      text,
  angle              text,
  summary            text,
  search_text        text,
  tsv tsvector generated always as
      (to_tsvector('simple', coalesce(search_text, ''))) stored,
  embedding          vector(1024)  -- voyage-3.5 output dimension
);

-- No vector index: 60 rows scan instantly. At 6,469 ads, add:
-- create index on ads using hnsw (embedding vector_cosine_ops);

-- Tables created before ended_on existed.
alter table ads add column if not exists ended_on date;
