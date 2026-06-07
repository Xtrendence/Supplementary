export type DrawerConfig = {
  divider: true;
  name?: never;
  title?: never;
  icon?: never;
  route?: never;
} | {
  divider?: false;
  name: string;
  title: string;
  icon?: string;
  route?: string;
}

export interface NavigationConfig {
  drawer: {
    items: DrawerConfig[];
  };
}

export const navigationConfig: NavigationConfig = {
  drawer: {
    items: [
      {
        name: "home",
        title: "Home",
        icon: "home",
        route: "/",
      },
      {
        name: "profile",
        title: "Profile",
        icon: "person",
        route: "/profile",
      },
      {
        divider: true,
      },
      {
        name: "settings",
        title: "Settings",
        icon: "settings",
        route: "/settings",
      },

    ],
  },
};
