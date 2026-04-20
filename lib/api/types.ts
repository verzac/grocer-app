export type UserGuild = {
  id: string;
  name: string;
  icon: string | null;
};

export type UserGuildsResponse = {
  guilds: UserGuild[];
};

export type GroceryList = {
  id: number;
  created_at: string;
  updated_at: string;
  guild_id: string;
  list_label: string;
  fancy_name: string | null;
};

export type GroceryEntry = {
  id: number;
  created_at: string;
  updated_at: string;
  item_desc: string;
  updated_by_id?: string;
  grocery_list_id: number | null;
};

export type GuildGroceryList = {
  guild_id: string;
  grocery_entries: GroceryEntry[];
  grocery_lists: GroceryList[];
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};
