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

export type ForumReply = {
  id: string;
  author: string;
  role: string;
  timeAgo: string;
  text: string;
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
  // Respuestas embebidas si el backend las incluye en GET /forum/posts.
  replies?: ForumReply[];
  // El backend marca si el usuario en sesión ya reportó esta publicación.
  hasReported?: boolean;
};
