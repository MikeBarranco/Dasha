export type CommunityEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  place: string;
  image: string;
  description: string;
  interested: number;
};

export type ForumPost = {
  id: string;
  author: string;
  role: string;
  timeAgo: string;
  text: string;
  image?: string;
  likes: number;
  comments: number;
};
