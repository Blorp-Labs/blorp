import {
  notifications,
  people,
  home,
  homeOutline,
  peopleOutline,
  notificationsOutline,
  create,
  createOutline,
  chatbubble,
  chatbubbleOutline,
} from "ionicons/icons";

export const TABS: {
  icon: (active?: boolean) => string;
  to: string;
  label: string;
  id: string;
}[] = [
  {
    icon: (isActive) => (isActive ? home : homeOutline),
    to: "/home",
    label: "Home",
    id: "home",
  },
  {
    icon: (isActive) => (isActive ? people : peopleOutline),
    to: "/communities",
    label: "Communities",
    id: "communities",
  },
  {
    icon: (isActive) => (isActive ? create : createOutline),
    to: "/create_post",
    label: "Post",
    id: "create_post",
  },
  {
    icon: (isActive) => (isActive ? notifications : notificationsOutline),
    to: "/inbox",
    label: "Inbox",
    id: "inbox",
  },
  {
    icon: (isActive) => (isActive ? chatbubble : chatbubbleOutline),
    to: "/messages",
    label: "Messages",
    id: "messages",
  },
];

export const LEFT_SIDEBAR_MENU_ID = "left-sidebar-menu";
export const RIGHT_SIDEBAR_MENU_ID = "right-sidebar-menu";
