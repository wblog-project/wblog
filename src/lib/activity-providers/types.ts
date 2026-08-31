export type ActivityCard = {
  type: string;
  label?: string;
  icon?: string;
  title: string;
  subtitle: string;
  metric: string;
  href: string;
  image: string;
};

export type ActivityProvider = {
  type: string;
  enabled: () => boolean;
  load: () => Promise<ActivityCard[]>;
};
